from sqlalchemy.orm import Session

from app.models.reading import SensorReading
from app.models.field import Field
from app.models.prediction import Prediction
from app.ml.inference import predict_crop, predict_fertilizer_ml
from app.services.feature_service import build_crop_features, build_fertilizer_features
from app.utils.rules import rule_based_fertilizer


def run_inference(db: Session, field_id: str, sensor_id: str | None = None) -> Prediction:
    query = db.query(SensorReading).filter(SensorReading.field_id == field_id)
    if sensor_id:
        query = query.filter(SensorReading.sensor_id == sensor_id)
    reading = query.order_by(SensorReading.timestamp.desc()).first()

    if reading is None:
        raise ValueError(f"No readings found for field={field_id}")

    field = db.query(Field).filter(Field.id == field_id).first()
    if field is None:
        field = Field(
            id=field_id, name=field_id,
            soil_type="Loamy", crop_type="Wheat",
            nitrogen=40.0, phosphorus=40.0, potassium=40.0,
            humidity=60.0, rainfall=100.0,
        )
        db.add(field)
        db.flush()

    crop_features = build_crop_features(reading, field)
    fert_features = build_fertilizer_features(reading, field)

    crop_result = predict_crop(**crop_features)
    crop_name = crop_result[0] if crop_result else None
    crop_conf = crop_result[1] if crop_result else None

    fertilizer_rule = rule_based_fertilizer(field.nitrogen, field.phosphorus, field.potassium)

    fertilizer_ml = predict_fertilizer_ml(**fert_features)

    prediction = Prediction(
        field_id=field_id,
        sensor_id=reading.sensor_id,
        crop_recommendation=crop_name,
        crop_confidence=crop_conf,
        fertilizer_recommendation=fertilizer_rule,
        fertilizer_source="rule_based",
        feature_snapshot={
            "crop_features": crop_features,
            "fert_features": fert_features,
            "fertilizer_ml_output": fertilizer_ml,
        },
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction
