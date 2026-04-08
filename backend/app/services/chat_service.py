from sqlalchemy.orm import Session

from app.models.reading import SensorReading
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation


def build_chat_context(db: Session, field_id: str) -> dict:
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.field_id == field_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(10)
        .all()
    )

    prediction = (
        db.query(Prediction)
        .filter(Prediction.field_id == field_id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.field_id == field_id)
        .order_by(Recommendation.timestamp.desc())
        .limit(10)
        .all()
    )

    sensor_summary = []
    for r in readings:
        sensor_summary.append({
            "sensor_id": r.sensor_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "pH": r.ph,
            "soil_moisture_pct": r.soil_moisture,
            "soil_temperature_c": r.soil_temperature,
            "ec_ms_cm": r.electrical_conductivity,
            "gas_composition": r.gas_composition,
            "vibroacoustic_note": r.vibroacoustic,
        })

    prediction_summary = None
    if prediction:
        prediction_summary = {
            "crop_recommendation": prediction.crop_recommendation,
            "crop_confidence": prediction.crop_confidence,
            "fertilizer_recommendation": prediction.fertilizer_recommendation,
            "fertilizer_source": prediction.fertilizer_source,
            "timestamp": prediction.timestamp.isoformat() if prediction.timestamp else None,
        }

    rec_summary = []
    for rec in recs:
        rec_summary.append({
            "level": rec.level,
            "title": rec.title_text,
            "message": rec.message_text,
            "timeline_steps": len(rec.timeline) if rec.timeline else 0,
        })

    return {
        "field_id": field_id,
        "sensor_readings": sensor_summary,
        "prediction": prediction_summary,
        "active_recommendations": rec_summary,
        "system_instruction": (
            "You are a soil health advisory assistant for the SoiLink agricultural monitoring system. "
            "Use the sensor readings, ML predictions, and recommendations above to explain the current "
            "field status to the farmer. Do NOT invent agronomic decisions beyond what the backend data shows. "
            "Explain why each recommendation was made based on the sensor values and thresholds."
        ),
    }
