"""
Crop Recommendation Classifier — LightGBM with SoilGrids features

Features (sensor + field + SoilGrids physical composition):
    N, P, K             – macro-nutrients (kg/ha)
    temperature         – soil temperature (°C)
    humidity            – ambient relative humidity (%)
    ph                  – soil pH
    rainfall            – mm
    soil_type_enc       – encoded soil type (0-4)
    clay_content        – SoilGrids clay content g/kg
    sand_content        – SoilGrids sand content g/kg
    silt_content        – SoilGrids silt content g/kg
    soc                 – SoilGrids soil organic carbon g/kg
    cec                 – SoilGrids cation exchange capacity mmol(c)/kg
    bdod                – SoilGrids bulk density cg/cm³

Note: SoilGrids features are used ONLY for training to enrich the model.
At inference time, soil-type defaults are substituted (no API call needed).

Usage:
    cd backend
    python ml_models/train_crop_recommendation.py
"""

import sys
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

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
N_SAMPLES = 12000

SOIL_TYPES = ["Sandy", "Loamy", "Clayey", "Black", "Red"]

# SoilGrids realistic ranges per soil type
_SOILGRID_BY_TYPE = {
    0: {"clay": (60, 150),  "sand": (700, 900), "silt": (50, 200),  "soc": (3, 15),  "cec": (50, 150),  "bdod": (140, 165)},   # Sandy
    1: {"clay": (150, 300), "sand": (300, 500), "silt": (250, 450), "soc": (10, 40), "cec": (140, 260), "bdod": (115, 145)},   # Loamy
    2: {"clay": (400, 700), "sand": (80, 250),  "silt": (150, 400), "soc": (15, 60), "cec": (250, 450), "bdod": (95, 130)},    # Clayey
    3: {"clay": (500, 720), "sand": (60, 200),  "silt": (100, 350), "soc": (20, 80), "cec": (350, 520), "bdod": (85, 120)},    # Black
    4: {"clay": (200, 420), "sand": (300, 520), "silt": (150, 380), "soc": (5, 25),  "cec": (90, 210),  "bdod": (120, 155)},   # Red
}

# Agronomic crop profiles: (crop, preferred_soil_types, n_range, p_range, k_range,
#                            ph_range, temp_range, humidity_range, rainfall_range)
CROP_PROFILES = [
    ("Wheat",       [0, 1, 4], (40, 100), (30, 90), (30, 80), (6.0, 7.5), (10, 25), (40, 70), (50, 200)),
    ("Barley",      [0, 1],    (30, 90),  (25, 80), (25, 70), (6.0, 7.5), (10, 22), (40, 65), (50, 180)),
    ("Maize",       [1, 2],    (50, 120), (40, 100),(40, 100),(5.8, 7.0), (18, 32), (50, 80), (80, 280)),
    ("Paddy",       [2, 3],    (60, 130), (40, 100),(50, 110),(5.5, 6.5), (22, 35), (65, 95), (150, 300)),
    ("Cotton",      [1, 3, 4], (50, 110), (30, 80), (40, 90), (6.0, 7.0), (20, 32), (50, 80), (70, 200)),
    ("Sugarcane",   [1, 2, 3], (70, 130), (50, 110),(60, 120),(6.0, 7.5), (20, 35), (60, 90), (100, 280)),
    ("Millets",     [0, 4],    (20, 70),  (15, 60), (20, 60), (5.5, 7.5), (18, 35), (35, 65), (40, 160)),
    ("Pulses",      [1, 4],    (10, 50),  (30, 80), (20, 70), (6.0, 7.5), (15, 28), (45, 75), (50, 180)),
    ("Oil seeds",   [1, 4],    (25, 80),  (25, 75), (20, 65), (5.8, 7.0), (15, 28), (40, 70), (50, 200)),
    ("Ground Nuts", [0, 1],    (15, 50),  (30, 80), (40, 90), (5.5, 7.0), (20, 30), (45, 70), (50, 160)),
    ("Tobacco",     [0, 1],    (30, 80),  (20, 65), (30, 80), (5.5, 7.0), (18, 28), (45, 70), (40, 150)),
]

FEATURES = [
    "N", "P", "K", "temperature", "humidity", "ph", "rainfall",
    "soil_type_enc",
    "clay_content", "sand_content", "silt_content", "soc", "cec", "bdod",
]


def _soilgrid_for_type(rng, soil_idx: int, n: int) -> dict:
    sg = _SOILGRID_BY_TYPE[soil_idx]
    return {
        "clay_content": rng.uniform(*sg["clay"], n),
        "sand_content": rng.uniform(*sg["sand"], n),
        "silt_content": rng.uniform(*sg["silt"], n),
        "soc":          rng.uniform(*sg["soc"],  n),
        "cec":          rng.uniform(*sg["cec"],  n),
        "bdod":         rng.uniform(*sg["bdod"], n),
    }


def generate_dataset(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    per_crop = n // len(CROP_PROFILES)

    for crop, soil_types, n_r, p_r, k_r, ph_r, temp_r, hum_r, rain_r in CROP_PROFILES:
        n_rows = per_crop
        soil_idxs = rng.choice(soil_types, n_rows)

        base = pd.DataFrame({
            "N":           rng.uniform(*n_r,    n_rows),
            "P":           rng.uniform(*p_r,    n_rows),
            "K":           rng.uniform(*k_r,    n_rows),
            "temperature": rng.uniform(*temp_r, n_rows),
            "humidity":    rng.uniform(*hum_r,  n_rows),
            "ph":          rng.uniform(*ph_r,   n_rows),
            "rainfall":    rng.uniform(*rain_r, n_rows),
            "soil_type_enc": soil_idxs.astype(float),
            "crop": crop,
        })

        # Add SoilGrids features per soil type
        for col in ["clay_content", "sand_content", "silt_content", "soc", "cec", "bdod"]:
            base[col] = 0.0
        for st_idx in set(soil_idxs.tolist()):
            mask = soil_idxs == st_idx
            sg = _SOILGRID_BY_TYPE[st_idx]
            base.loc[mask, "clay_content"] = rng.uniform(*sg["clay"], mask.sum())
            base.loc[mask, "sand_content"] = rng.uniform(*sg["sand"], mask.sum())
            base.loc[mask, "silt_content"] = rng.uniform(*sg["silt"], mask.sum())
            base.loc[mask, "soc"]          = rng.uniform(*sg["soc"],  mask.sum())
            base.loc[mask, "cec"]          = rng.uniform(*sg["cec"],  mask.sum())
            base.loc[mask, "bdod"]         = rng.uniform(*sg["bdod"], mask.sum())

        rows.append(base)

    df = pd.concat(rows, ignore_index=True)

    # Add Gaussian noise to blur decision boundaries
    noise_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall",
                  "clay_content", "sand_content", "silt_content", "soc", "cec", "bdod"]
    for col in noise_cols:
        df[col] += rng.normal(0, df[col].std() * 0.05, len(df))

    df["N"]           = df["N"].clip(0, 140)
    df["P"]           = df["P"].clip(0, 140)
    df["K"]           = df["K"].clip(0, 140)
    df["temperature"] = df["temperature"].clip(5, 45)
    df["humidity"]    = df["humidity"].clip(10, 100)
    df["ph"]          = df["ph"].clip(4.0, 9.0)
    df["rainfall"]    = df["rainfall"].clip(10, 400)
    df["clay_content"] = df["clay_content"].clip(0, 1000)
    df["sand_content"] = df["sand_content"].clip(0, 1000)
    df["silt_content"] = df["silt_content"].clip(0, 1000)
    df["soc"]  = df["soc"].clip(0, 150)
    df["cec"]  = df["cec"].clip(0, 600)
    df["bdod"] = df["bdod"].clip(50, 200)

    return df.sample(frac=1, random_state=seed).reset_index(drop=True)


def train():
    print("Generating crop recommendation dataset with SoilGrids features …")
    df = generate_dataset(N_SAMPLES, RANDOM_SEED)

    print(f"  Samples: {len(df)}")
    print(f"  Crop distribution:\n{df['crop'].value_counts()}\n")

    label_enc = LabelEncoder()
    y = label_enc.fit_transform(df["crop"])
    X = df[FEATURES]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    if USE_LGBM:
        print("Training LightGBM crop classifier …")
        model = lgb.LGBMClassifier(
            n_estimators=400,
            learning_rate=0.05,
            max_depth=7,
            num_leaves=40,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=RANDOM_SEED,
            verbose=-1,
        )
    else:
        print("LightGBM not available — training RandomForest …")
        from sklearn.ensemble import RandomForestClassifier
        model = RandomForestClassifier(
            n_estimators=300,
            max_depth=12,
            random_state=RANDOM_SEED,
            n_jobs=-1,
        )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, target_names=label_enc.classes_))

    model_path = MODELS_DIR / "crop_recommendation_model.pkl"
    encoder_path = MODELS_DIR / "crop_label_encoder.pkl"
    meta_path = MODELS_DIR / "crop_model_meta.pkl"

    joblib.dump(model, model_path)
    joblib.dump(label_enc, encoder_path)
    joblib.dump({"features": FEATURES, "classes": list(label_enc.classes_)}, meta_path)

    print(f"Saved → {model_path}")
    print(f"Saved → {encoder_path}")
    print(f"Saved → {meta_path}")


if __name__ == "__main__":
    train()
