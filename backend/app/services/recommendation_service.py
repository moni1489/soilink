from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.models.reading import SensorReading
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation
from app.utils.rules import (
    PH_LOW, PH_HIGH, MOISTURE_LOW, MOISTURE_HIGH,
    TEMP_HIGH, EC_HIGH, classify_sensor_status,
)


def _now_str(delta_hours: float = 0) -> str:
    dt = datetime.now(timezone.utc) + timedelta(hours=delta_hours)
    return dt.strftime("%Y-%m-%d %H:%M")


def generate_recommendations(
    db: Session, field_id: str, prediction: Prediction | None = None
) -> list[Recommendation]:
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.field_id == field_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(20)
        .all()
    )
    if not readings:
        return []

    db.query(Recommendation).filter(Recommendation.field_id == field_id).delete()
    db.flush()

    recs: list[Recommendation] = []

    for r in readings:
        status = classify_sensor_status(r.ph, r.soil_moisture, r.soil_temperature, r.electrical_conductivity)

        if r.soil_moisture < MOISTURE_LOW:
            level = "critical" if r.soil_moisture < MOISTURE_LOW - 5 else "warning"
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level=level,
                title_key="recIrrigationOverloadTitle",
                message_key="recIrrigationOverloadMessage",
                title_text="Irrigation Required",
                message_text=f"Soil moisture at sensor {r.sensor_id} is {r.soil_moisture}%, below the {MOISTURE_LOW}% threshold. Immediate irrigation recommended.",
                timeline=[
                    {"id": f"irr-{r.sensor_id}-1", "label_key": "rec1Step1", "label_text": "Open emergency irrigation line", "due_at": _now_str(1), "completed": False},
                    {"id": f"irr-{r.sensor_id}-2", "label_key": "rec1Step2", "label_text": "Run 30-minute watering cycle", "due_at": _now_str(3), "completed": False},
                    {"id": f"irr-{r.sensor_id}-3", "label_key": "rec1Step3", "label_text": "Re-check moisture sensors", "due_at": _now_str(12), "completed": False},
                ],
            ))

        if r.ph < PH_LOW:
            level = "critical" if r.ph < PH_LOW - 0.5 else "warning"
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level=level,
                title_key="recLowPhTitle",
                message_key="recLowPhMessage",
                title_text="Low pH Detected",
                message_text=f"Soil pH at sensor {r.sensor_id} is {r.ph}, below optimal range ({PH_LOW}-{PH_HIGH}). Lime treatment recommended.",
                timeline=[
                    {"id": f"ph-{r.sensor_id}-1", "label_key": "rec2Step1", "label_text": "Prepare lime mixture", "due_at": _now_str(2), "completed": False},
                    {"id": f"ph-{r.sensor_id}-2", "label_key": "rec2Step2", "label_text": "Apply treatment on affected zone", "due_at": _now_str(8), "completed": False},
                ],
            ))
        elif r.ph > PH_HIGH:
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level="warning",
                title_key="recHighPhTitle",
                message_key="recHighPhMessage",
                title_text="High pH Detected",
                message_text=f"Soil pH at sensor {r.sensor_id} is {r.ph}, above optimal range. Consider sulfur amendment.",
                timeline=[
                    {"id": f"phh-{r.sensor_id}-1", "label_key": "recHighPhStep1", "label_text": "Test soil sample for alkalinity", "due_at": _now_str(4), "completed": False},
                    {"id": f"phh-{r.sensor_id}-2", "label_key": "recHighPhStep2", "label_text": "Apply sulfur-based amendment", "due_at": _now_str(24), "completed": False},
                ],
            ))

        if r.soil_temperature > TEMP_HIGH:
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level="warning",
                title_key="recHighTempTitle",
                message_key="recHighTempMessage",
                title_text="High Soil Temperature",
                message_text=f"Soil temperature at sensor {r.sensor_id} is {r.soil_temperature}C, exceeding {TEMP_HIGH}C. Mulching or shade cover recommended.",
                timeline=[
                    {"id": f"tmp-{r.sensor_id}-1", "label_key": "recHighTempStep1", "label_text": "Apply mulch layer to affected area", "due_at": _now_str(6), "completed": False},
                ],
            ))

        if r.electrical_conductivity > EC_HIGH:
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level="warning",
                title_key="recHighEcTitle",
                message_key="recHighEcMessage",
                title_text="High Electrical Conductivity",
                message_text=f"EC at sensor {r.sensor_id} is {r.electrical_conductivity} mS/cm, indicating possible salinity. Leaching irrigation recommended.",
                timeline=[
                    {"id": f"ec-{r.sensor_id}-1", "label_key": "recHighEcStep1", "label_text": "Schedule leaching irrigation", "due_at": _now_str(8), "completed": False},
                ],
            ))

        if r.vibroacoustic and ("compaction" in r.vibroacoustic.lower() or "critical" in r.vibroacoustic.lower()):
            recs.append(Recommendation(
                field_id=field_id,
                sensor_id=r.sensor_id,
                level="premium",
                title_key="recVibroAlertTitle",
                message_key="recVibroAlertMessage",
                title_text="Vibroacoustic Compaction Alert",
                message_text=f"Vibroacoustic analysis at sensor {r.sensor_id} indicates soil compaction. Tillage intervention recommended.",
                timeline=[
                    {"id": f"vib-{r.sensor_id}-1", "label_key": "rec4Step1", "label_text": "Collect vibroacoustic sample", "due_at": _now_str(2), "completed": False},
                    {"id": f"vib-{r.sensor_id}-2", "label_key": "rec4Step2", "label_text": "Schedule anti-compaction tillage", "due_at": _now_str(24), "completed": False},
                ],
            ))

    if prediction and prediction.crop_recommendation:
        recs.append(Recommendation(
            field_id=field_id,
            level="plan",
            title_key="recCropSuggestionTitle",
            message_key="recCropSuggestionMessage",
            title_text="Crop Recommendation Available",
            message_text=f"Based on current soil conditions, '{prediction.crop_recommendation}' is recommended (confidence: {prediction.crop_confidence:.0%}). Fertilizer suggestion: {prediction.fertilizer_recommendation}.",
            timeline=[
                {"id": f"crop-{field_id}-1", "label_key": "recCropStep1", "label_text": "Review crop suitability report", "due_at": _now_str(4), "completed": False},
                {"id": f"crop-{field_id}-2", "label_key": "recCropStep2", "label_text": "Plan planting schedule", "due_at": _now_str(48), "completed": False},
            ],
        ))

    for rec in recs:
        db.add(rec)
    db.commit()
    for rec in recs:
        db.refresh(rec)

    return recs
