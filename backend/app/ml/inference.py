import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

from app.core.config import settings

# Модель состояния почвы переехала в app/ml/soil_models.py: она переобучена
# на лабораторных измерениях (Supplement 2) и работает на другом наборе
# признаков. Здесь остались только модели культуры и удобрения.

_crop_model = None
_crop_encoder = None
_crop_meta = None       # features list for new SoilGrid-enriched model
_fert_model = None
_fert_encoders = None
_loaded = False


def load_models():
    global _crop_model, _crop_encoder, _crop_meta
    global _fert_model, _fert_encoders
    global _loaded
    if _loaded:
        return

    models_dir: Path = settings.models_path

    crop_model_path  = models_dir / "crop_recommendation_model.pkl"
    crop_encoder_path = models_dir / "crop_label_encoder.pkl"
    crop_meta_path   = models_dir / "crop_model_meta.pkl"
    fert_model_path  = models_dir / "fertilizer_recommendation_model.pkl"
    fert_encoders_path = models_dir / "fertilizer_encoders.pkl"

    if crop_model_path.exists() and crop_encoder_path.exists():
        _crop_model = joblib.load(crop_model_path)
        _crop_encoder = joblib.load(crop_encoder_path)
        if crop_meta_path.exists():
            _crop_meta = joblib.load(crop_meta_path)

    if fert_model_path.exists() and fert_encoders_path.exists():
        _fert_model = joblib.load(fert_model_path)
        _fert_encoders = joblib.load(fert_encoders_path)

    _loaded = True


def predict_crop(
    nitrogen: float,
    phosphorus: float,
    potassium: float,
    temperature: float,
    humidity: float,
    ph: float,
    rainfall: float,
    soil_type_enc: float = 1.0,
    clay_content: float = 220.0,
    sand_content: float = 420.0,
    silt_content: float = 360.0,
    soc: float = 25.0,
    cec: float = 180.0,
    bdod: float = 135.0,
) -> Optional[tuple[str, float]]:
    load_models()
    if _crop_model is None or _crop_encoder is None:
        return None

    # If the model has a stored feature list (new SoilGrid-enriched model), use it
    if _crop_meta and "features" in _crop_meta:
        row = pd.DataFrame([{
            "N": nitrogen, "P": phosphorus, "K": potassium,
            "temperature": temperature, "humidity": humidity,
            "ph": ph, "rainfall": rainfall,
            "soil_type_enc": soil_type_enc,
            "clay_content": clay_content, "sand_content": sand_content,
            "silt_content": silt_content, "soc": soc, "cec": cec, "bdod": bdod,
        }])[_crop_meta["features"]]
    else:
        # Legacy model: 7-feature vector without SoilGrids
        row = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])

    pred = _crop_model.predict(row)[0]
    proba = _crop_model.predict_proba(row)[0]
    confidence = float(proba.max())
    crop_name = _crop_encoder.inverse_transform([pred])[0]
    return crop_name, confidence


def predict_fertilizer_ml(
    temperature: float,
    humidity: float,
    moisture: float,
    soil_type: str,
    crop_type: str,
    nitrogen: float = 40.0,
    phosphorus: float = 40.0,
    potassium: float = 40.0,
) -> Optional[str]:
    load_models()
    if _fert_model is None or _fert_encoders is None:
        return None

    soil_enc = _fert_encoders.get("soil_encoder")
    crop_enc = _fert_encoders.get("crop_encoder")
    fert_enc = _fert_encoders.get("fertilizer_encoder")

    if soil_enc is None or crop_enc is None or fert_enc is None:
        return None

    if soil_type not in list(soil_enc.classes_):
        soil_type = "Loamy"
    if crop_type not in list(crop_enc.classes_):
        crop_type = "Wheat"

    soil_encoded = soil_enc.transform([soil_type])[0]
    crop_encoded = crop_enc.transform([crop_type])[0]

    # Use stored feature list if available (new model includes N, P, K)
    features = _fert_encoders.get("features",
        ["Temparature", "Humidity ", "Moisture", "Soil Type", "Crop Type"])

    row_data = {
        "Temparature": temperature,
        "Humidity ": humidity,
        "Moisture": moisture,
        "Soil Type": soil_encoded,
        "Crop Type": crop_encoded,
        "N": nitrogen,
        "P": phosphorus,
        "K": potassium,
    }
    df = pd.DataFrame([[row_data[f] for f in features]], columns=features)
    pred = _fert_model.predict(df)[0]
    return fert_enc.inverse_transform([pred])[0]
