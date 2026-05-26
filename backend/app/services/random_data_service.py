import random
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.field import Field
from app.models.reading import SensorReading


SOIL_TYPES = ["Loamy", "Sandy", "Clay", "Silty", "Peaty", "Chalky"]
CROP_TYPES = ["Wheat", "Rice", "Maize", "Chickpea", "KidneyBeans", "PigeonPeas",
              "MothBeans", "MungBean", "Blackgram", "Lentil", "Pomegranate",
              "Banana", "Mango", "Grapes", "Watermelon", "Muskmelon", "Apple",
              "Orange", "Papaya", "Coconut", "Cotton", "Jute", "Coffee"]

# Kazakhstan / Central Asia coordinate bounding box
_LAT_MIN, _LAT_MAX = 40.5, 55.5
_LON_MIN, _LON_MAX = 50.0, 87.0

_VIBRO_OPTIONS = [
    None,
    "Loose and stable profile, low compaction risk",
    "Localized layer hardening at 20-30 cm depth",
    "High compaction and microcrack density, intervention required",
    "Moderate density, normal seasonal variation",
]


def generate_mock_field(field_id: str | None = None) -> Field:
    fid = field_id or f"demo-{uuid.uuid4().hex[:8]}"
    soil = random.choice(SOIL_TYPES)
    crop = random.choice(CROP_TYPES)
    return Field(
        id=fid,
        name=f"Demo Field {fid[-6:].upper()}",
        area_hectares=round(random.uniform(1.0, 50.0), 1),
        soil_type=soil,
        crop_type=crop,
        nitrogen=round(random.uniform(10.0, 140.0), 1),
        phosphorus=round(random.uniform(5.0, 145.0), 1),
        potassium=round(random.uniform(5.0, 205.0), 1),
        humidity=round(random.uniform(14.0, 100.0), 1),
        rainfall=round(random.uniform(20.0, 300.0), 1),
        latitude=round(random.uniform(_LAT_MIN, _LAT_MAX), 5),
        longitude=round(random.uniform(_LON_MIN, _LON_MAX), 5),
    )


def generate_mock_reading(sensor_id: str, field_id: str,
                          offset_minutes: int = 0) -> SensorReading:
    co2 = round(random.uniform(0.03, 0.12), 2)
    gas = f"N2 {random.randint(75, 78)}%, O2 {random.randint(19, 21)}%, CO2 {co2}%"
    ts = datetime.now(timezone.utc) - timedelta(minutes=offset_minutes)
    return SensorReading(
        sensor_id=sensor_id,
        field_id=field_id,
        timestamp=ts,
        ph=round(random.uniform(4.5, 8.0), 1),
        soil_temperature=round(random.uniform(10.0, 35.0), 1),
        soil_moisture=round(random.uniform(15.0, 60.0), 1),
        electrical_conductivity=round(random.uniform(0.5, 2.8), 2),
        gas_composition=gas,
        vibroacoustic=random.choice(_VIBRO_OPTIONS),
    )


def _groq_summary(field: Field, prediction, language: str = "en") -> str:
    """Ask Groq for a plain-language summary of the generated scenario."""
    if not settings.GROQ_API_KEY:
        return "Groq not configured — set GROQ_API_KEY to enable AI summaries."

    field_info = (
        f"Field '{field.name}': {field.area_hectares} ha, {field.soil_type} soil, "
        f"target crop {field.crop_type}. "
        f"NPK: N={field.nitrogen}, P={field.phosphorus}, K={field.potassium}. "
        f"Humidity={field.humidity}%, Rainfall={field.rainfall} mm."
    )

    pred_info = "No prediction available."
    if prediction:
        pred_info = (
            f"ML predicted crop: {prediction.crop_recommendation} "
            f"(confidence {(prediction.crop_confidence or 0):.0%}), "
            f"fertilizer: {prediction.fertilizer_recommendation} "
            f"(source: {prediction.fertilizer_source}), "
            f"soil state: {prediction.soil_state} "
            f"(confidence {(prediction.soil_state_confidence or 0):.0%})."
        )

    prompt = (
        f"You are an agricultural advisor. Summarise this randomly generated demo field scenario "
        f"in 3-4 sentences and give 2 key actionable tips for the farmer. "
        f"Respond in {language}.\n\n"
        f"Field data: {field_info}\n"
        f"Prediction: {pred_info}"
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.6,
                    "max_tokens": 512,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        return f"Groq call failed: {exc}"


def seed_random_scenario(
    db: Session,
    field_id: str | None = None,
    n_sensors: int = 3,
    readings_per_sensor: int = 5,
    language: str = "en",
) -> dict:
    """
    1. Create (or reuse) a random Field in the DB.
    2. Generate n_sensors × readings_per_sensor SensorReadings spread over the
       last hour and persist them.
    3. Run the ML prediction pipeline (crop / fertilizer / soil-state).
    4. Generate actionable recommendations.
    5. Ask Groq for a plain-language scenario summary.
    Returns a dict with field, readings count, prediction, and Groq summary.
    """
    from app.services.prediction_service import run_inference
    from app.services.recommendation_service import generate_recommendations

    # --- field ---
    existing = db.query(Field).filter(Field.id == field_id).first() if field_id else None
    if existing:
        field = existing
    else:
        field = generate_mock_field(field_id)
        db.add(field)
        db.flush()

    # --- readings ---
    sensor_ids = [f"sensor-{field.id[-6:]}-{i+1}" for i in range(n_sensors)]
    total_readings = 0
    interval = 60 // max(readings_per_sensor, 1)  # spread over ~1 hour
    for sensor_id in sensor_ids:
        for j in range(readings_per_sensor):
            reading = generate_mock_reading(
                sensor_id=sensor_id,
                field_id=field.id,
                offset_minutes=j * interval,
            )
            db.add(reading)
            total_readings += 1
    db.commit()

    # --- ML inference ---
    try:
        prediction = run_inference(db, field.id)
        generate_recommendations(db, field.id, prediction)
    except Exception as exc:
        prediction = None
        prediction_error = str(exc)
    else:
        prediction_error = None

    # --- Groq summary ---
    groq_summary = _groq_summary(field, prediction, language=language)

    prediction_out = None
    if prediction:
        prediction_out = {
            "crop_recommendation": prediction.crop_recommendation,
            "crop_confidence": prediction.crop_confidence,
            "fertilizer_recommendation": prediction.fertilizer_recommendation,
            "fertilizer_source": prediction.fertilizer_source,
            "soil_state": prediction.soil_state,
            "soil_state_confidence": prediction.soil_state_confidence,
        }

    return {
        "field_id": field.id,
        "field_name": field.name,
        "soil_type": field.soil_type,
        "crop_type": field.crop_type,
        "area_hectares": field.area_hectares,
        "sensors": sensor_ids,
        "readings_created": total_readings,
        "prediction": prediction_out,
        "prediction_error": prediction_error,
        "groq_summary": groq_summary,
    }
