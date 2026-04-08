import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional

from app.core.config import settings

_crop_model = None
_crop_encoder = None
_fert_model = None
_fert_encoders = None
_loaded = False


def load_models():
    global _crop_model, _crop_encoder, _fert_model, _fert_encoders, _loaded
    if _loaded:
        return

    models_dir: Path = settings.models_path

    crop_model_path = models_dir / "crop_recommendation_model.pkl"
    crop_encoder_path = models_dir / "crop_label_encoder.pkl"
    fert_model_path = models_dir / "fertilizer_recommendation_model.pkl"
    fert_encoders_path = models_dir / "fertilizer_encoders.pkl"

    if crop_model_path.exists() and crop_encoder_path.exists():
        _crop_model = joblib.load(crop_model_path)
        _crop_encoder = joblib.load(crop_encoder_path)

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
) -> Optional[tuple[str, float]]:
    load_models()
    if _crop_model is None or _crop_encoder is None:
        return None

    features = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])
    pred = _crop_model.predict(features)[0]
    proba = _crop_model.predict_proba(features)[0]
    confidence = float(proba.max())
    crop_name = _crop_encoder.inverse_transform([pred])[0]
    return crop_name, confidence


def predict_fertilizer_ml(
    temperature: float,
    humidity: float,
    moisture: float,
    soil_type: str,
    crop_type: str,
) -> Optional[str]:
    """Use the uploaded ML model. Note: this model has ~25% accuracy."""
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

    # Column order must match training: ['Temparature', 'Humidity ', 'Moisture', 'Soil Type', 'Crop Type']
    df = pd.DataFrame(
        [[temperature, humidity, moisture, soil_encoded, crop_encoded]],
        columns=["Temparature", "Humidity ", "Moisture", "Soil Type", "Crop Type"],
    )
    pred = _fert_model.predict(df)[0]
    return fert_enc.inverse_transform([pred])[0]
