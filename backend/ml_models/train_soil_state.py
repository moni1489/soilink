"""
Soil State Classifier — LightGBM


Classes:
    0 = critical   (immediate intervention needed)
    1 = poor       (several parameters out of range)
    2 = moderate   (some parameters borderline)
    3 = healthy    (all parameters within optimal range)

Features (matching ERA5-land + sensor readings):
    N, P, K             – macro-nutrients (0-140 kg/ha)
    pH                  – soil pH (4.0-9.0)
    soil_moisture       – volumetric water content % (5-90)
    soil_temperature    – °C (0-45)
    electrical_conductivity – mS/cm (0.1-5.0)
    humidity            – ambient relative humidity % (20-95)
    rainfall            – mm (20-300)
    soil_type_enc       – encoded soil type (0-4)

Usage:
    cd backend
    python ml_models/train_soil_state.py
"""

import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

# ── optional LightGBM, fallback to RandomForest ─────────────────────────────
try:
    import lightgbm as lgb
    USE_LGBM = True
except ImportError:
    USE_LGBM = False
    from sklearn.ensemble import RandomForestClassifier

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score

MODELS_DIR = Path(__file__).resolve().parent
RANDOM_SEED = 42
N_SAMPLES = 8000

SOIL_TYPES = ["Sandy", "Loamy", "Clayey", "Black", "Red"]

# ── agronomic thresholds ─────────────────────────────────────────────────────
PH_OPT = (5.5, 7.5)
MOISTURE_OPT = (30.0, 65.0)
TEMP_OPT = (10.0, 30.0)
EC_OPT = (0.2, 2.0)
N_OPT = (25.0, 120.0)
P_OPT = (20.0, 100.0)
K_OPT = (20.0, 100.0)


def _label(row: pd.Series) -> int:
    """Rule-derived label with realistic interactions."""
    violations = 0
    severity = 0

    # pH checks
    if row.pH < 4.5 or row.pH > 8.5:
        violations += 1; severity += 2
    elif row.pH < PH_OPT[0] or row.pH > PH_OPT[1]:
        violations += 1; severity += 1

    # Moisture checks
    if row.soil_moisture < 15 or row.soil_moisture > 85:
        violations += 1; severity += 2
    elif row.soil_moisture < MOISTURE_OPT[0] or row.soil_moisture > MOISTURE_OPT[1]:
        violations += 1; severity += 1

    # Temperature checks
    if row.soil_temperature > 40 or row.soil_temperature < 2:
        violations += 1; severity += 2
    elif row.soil_temperature > TEMP_OPT[1] or row.soil_temperature < TEMP_OPT[0]:
        violations += 1; severity += 1

    # EC / salinity
    if row.electrical_conductivity > 4.0:
        violations += 1; severity += 2
    elif row.electrical_conductivity > EC_OPT[1]:
        violations += 1; severity += 1

    # Nutrient checks
    if row.N < 10 or row.P < 10 or row.K < 10:
        violations += 1; severity += 1
    elif row.N < N_OPT[0] or row.P < P_OPT[0] or row.K < K_OPT[0]:
        violations += 1

    if severity >= 4 or violations >= 3:
        return 0   # critical
    if severity >= 2 or violations == 2:
        return 1   # poor
    if violations == 1 or severity == 1:
        return 2   # moderate
    return 3       # healthy


def generate_dataset(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    soil_enc = LabelEncoder().fit(SOIL_TYPES)

    # Stratify sampling: more "real world" distribution
    # ~20% critical, 25% poor, 30% moderate, 25% healthy
    n_crit  = int(n * 0.20)
    n_poor  = int(n * 0.25)
    n_mod   = int(n * 0.30)
    n_good  = n - n_crit - n_poor - n_mod

    def block(n_rows, ph_range, moist_range, temp_range, ec_range, n_range):
        return pd.DataFrame({
            "N":  rng.uniform(*n_range, n_rows),
            "P":  rng.uniform(*n_range, n_rows),
            "K":  rng.uniform(*n_range, n_rows),
            "pH": rng.uniform(*ph_range, n_rows),
            "soil_moisture": rng.uniform(*moist_range, n_rows),
            "soil_temperature": rng.uniform(*temp_range, n_rows),
            "electrical_conductivity": rng.uniform(*ec_range, n_rows),
            "humidity": rng.uniform(20, 95, n_rows),
            "rainfall": rng.uniform(20, 300, n_rows),
            "soil_type_enc": rng.integers(0, len(SOIL_TYPES), n_rows).astype(float),
        })

    critical = block(n_crit, (4.0, 5.0), (5, 20), (38, 45), (3.5, 5.0), (0, 15))
    poor     = block(n_poor, (4.5, 5.5), (15, 28), (33, 40), (2.5, 4.0), (5, 25))
    moderate = block(n_mod,  (5.2, 7.8), (28, 35), (28, 35), (1.5, 2.5), (20, 30))
    healthy  = block(n_good, (5.6, 7.4), (30, 65), (10, 30), (0.3, 1.8), (30, 120))

    # Add Gaussian noise to blur decision boundaries
    df = pd.concat([critical, poor, moderate, healthy], ignore_index=True)
    noise_cols = ["N", "P", "K", "pH", "soil_moisture", "soil_temperature",
                  "electrical_conductivity", "humidity", "rainfall"]
    for col in noise_cols:
        df[col] += rng.normal(0, df[col].std() * 0.05, len(df))

    df["pH"] = df["pH"].clip(4.0, 9.0)
    df["soil_moisture"] = df["soil_moisture"].clip(5, 90)
    df["soil_temperature"] = df["soil_temperature"].clip(0, 45)
    df["electrical_conductivity"] = df["electrical_conductivity"].clip(0.1, 5.0)
    df["N"] = df["N"].clip(0, 140)
    df["P"] = df["P"].clip(0, 140)
    df["K"] = df["K"].clip(0, 140)
    df["humidity"] = df["humidity"].clip(10, 100)
    df["rainfall"] = df["rainfall"].clip(10, 400)

    df["soil_state"] = df.apply(_label, axis=1)
    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def train():
    print("Generating synthetic agronomic dataset …")
    df = generate_dataset(N_SAMPLES, RANDOM_SEED)

    print(f"  Samples: {len(df)}")
    print(f"  Class distribution:\n{df['soil_state'].value_counts().sort_index()}")
    print(f"    0=critical, 1=poor, 2=moderate, 3=healthy\n")

    FEATURES = ["N", "P", "K", "pH", "soil_moisture", "soil_temperature",
                "electrical_conductivity", "humidity", "rainfall", "soil_type_enc"]
    X = df[FEATURES]
    y = df["soil_state"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    if USE_LGBM:
        print("Training LightGBM classifier …")
        model = lgb.LGBMClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=RANDOM_SEED,
            verbose=-1,
        )
    else:
        print("LightGBM not available — training RandomForest …")
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=RANDOM_SEED,
            n_jobs=-1,
        )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred,
          target_names=["critical", "poor", "moderate", "healthy"]))

    # Save model + metadata
    out_path = MODELS_DIR / "soil_state_model.pkl"
    meta_path = MODELS_DIR / "soil_state_meta.pkl"
    joblib.dump(model, out_path)
    joblib.dump({"features": FEATURES, "classes": ["critical", "poor", "moderate", "healthy"]},
                meta_path)
    print(f"Saved → {out_path}")
    print(f"Saved → {meta_path}")


if __name__ == "__main__":
    train()
