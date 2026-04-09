"""
Fertilizer Recommendation Classifier — LightGBM

Features:
    temperature  – soil temperature (°C)
    humidity     – relative humidity (%)
    moisture     – soil moisture (%)
    soil_type    – encoded soil type
    crop_type    – encoded crop type
    N, P, K      – nutrient levels (kg/ha)

Usage:
    cd backend
    python ml_models/train_fertilizer.py
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path

try:
    import lightgbm as lgb
    USE_LGBM = True
except ImportError:
    USE_LGBM = False

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report

MODELS_DIR = Path(__file__).resolve().parent
RANDOM_SEED = 42
N_SAMPLES = 10000

SOIL_TYPES = ["Sandy", "Loamy", "Clayey", "Black", "Red"]
CROP_TYPES = [
    "Maize", "Sugarcane", "Cotton", "Paddy", "Barley",
    "Millets", "Wheat", "Tobacco", "Oil seeds", "Ground Nuts", "Pulses",
]
FERTILIZERS = ["10-26-26", "14-35-14", "17-17-17", "20-20", "28-28", "DAP", "Urea"]

# Fertilizer selection rules based on N/P/K deficiency
# Low N → Urea; Low P → DAP; Low K → 28-28; Balanced low → 17-17-17, etc.
def _choose_fertilizer(rng, n, p, k):
    n_low = n < 40
    p_low = p < 40
    k_low = k < 40
    if n_low and not p_low and not k_low:
        return "Urea"
    if p_low and not n_low and not k_low:
        return "DAP"
    if k_low and not n_low and not p_low:
        return "28-28"
    if p_low and k_low and not n_low:
        return "10-26-26"
    if n_low and p_low and not k_low:
        return "14-35-14"
    if n_low and p_low and k_low:
        return "17-17-17"
    return "20-20"


def generate_dataset(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    soil_enc = LabelEncoder().fit(SOIL_TYPES)
    crop_enc = LabelEncoder().fit(CROP_TYPES)

    for _ in range(n):
        soil = rng.choice(SOIL_TYPES)
        crop = rng.choice(CROP_TYPES)
        temp = rng.uniform(10, 40)
        humid = rng.uniform(20, 90)
        moisture = rng.uniform(15, 75)
        n_val = rng.uniform(5, 130)
        p_val = rng.uniform(5, 130)
        k_val = rng.uniform(5, 130)
        fertilizer = _choose_fertilizer(rng, n_val, p_val, k_val)
        # Add some noise to the labelling
        if rng.random() < 0.05:
            fertilizer = rng.choice(FERTILIZERS)

        rows.append({
            "Temparature": temp,
            "Humidity ": humid,
            "Moisture": moisture,
            "Soil Type": soil_enc.transform([soil])[0],
            "Crop Type": crop_enc.transform([crop])[0],
            "N": n_val,
            "P": p_val,
            "K": k_val,
            "Fertilizer Name": fertilizer,
        })

    return pd.DataFrame(rows)


FEATURES = ["Temparature", "Humidity ", "Moisture", "Soil Type", "Crop Type", "N", "P", "K"]


def train():
    print("Generating fertilizer dataset …")
    df = generate_dataset(N_SAMPLES, RANDOM_SEED)
    print(f"  Samples: {len(df)}")
    print(f"  Distribution:\n{df['Fertilizer Name'].value_counts()}\n")

    soil_enc = LabelEncoder().fit(SOIL_TYPES)
    crop_enc = LabelEncoder().fit(CROP_TYPES)
    fert_enc = LabelEncoder().fit(FERTILIZERS)

    y = fert_enc.transform(df["Fertilizer Name"])
    X = df[FEATURES]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    if USE_LGBM:
        print("Training LightGBM fertilizer classifier …")
        model = lgb.LGBMClassifier(
            n_estimators=300,
            learning_rate=0.05,
            max_depth=6,
            num_leaves=31,
            random_state=RANDOM_SEED,
            verbose=-1,
        )
    else:
        from sklearn.ensemble import RandomForestClassifier
        print("LightGBM not available — training RandomForest …")
        model = RandomForestClassifier(n_estimators=200, random_state=RANDOM_SEED, n_jobs=-1)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    print(f"Test accuracy: {accuracy_score(y_test, y_pred):.3f}")
    print(classification_report(y_test, y_pred, target_names=fert_enc.classes_))

    model_path = MODELS_DIR / "fertilizer_recommendation_model.pkl"
    encoders_path = MODELS_DIR / "fertilizer_encoders.pkl"

    joblib.dump(model, model_path)
    joblib.dump({
        "soil_encoder": soil_enc,
        "crop_encoder": crop_enc,
        "fertilizer_encoder": fert_enc,
        "features": FEATURES,
    }, encoders_path)

    print(f"Saved → {model_path}")
    print(f"Saved → {encoders_path}")


if __name__ == "__main__":
    train()
