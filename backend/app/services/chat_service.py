import httpx
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.reading import SensorReading
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation


_SYSTEM_PROMPT = """You are an expert agricultural advisor for the SoiLink soil monitoring platform.
You have access to real-time sensor readings, ML model predictions, and active field recommendations.
Your role is to help farmers understand their soil health and give actionable, specific advice.

IMPORTANT: Respond strictly in the language requested by the user or the language parameter provided.
Languages supported: English, Russian, Kazakh.

Guidelines:
- Base all advice strictly on the provided sensor data and ML predictions
- Explain WHY each action is needed (link to specific sensor values)
- Prioritize critical issues first, then warnings, then optimization
- Be concise and practical — farmers need clear, actionable steps
- Use metric units (°C, mS/cm, %, kg/ha)
- If data is missing or insufficient, say so clearly
"""


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
            "soil_state": prediction.soil_state,
            "soil_state_confidence": prediction.soil_state_confidence,
            "timestamp": prediction.timestamp.isoformat() if prediction.timestamp else None,
            "soilgrids": prediction.feature_snapshot.get("soilgrid_data", {}) if prediction.feature_snapshot else {},
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
        "system_instruction": _SYSTEM_PROMPT,
    }


def ask_chatbot(db: Session, field_id: str, user_message: str, rich_context: Optional[dict] = None, language: str = "ru") -> dict:
    """
    Send a question to Claude with full ML + sensor context for the given field.
    Includes optional rich_context from the UI (depth, selected layers).
    Returns {reply, context_used}.
    """
    if not settings.GROQ_API_KEY:
        return {
            "reply": "Chatbot is not configured. Please set GROQ_API_KEY in the backend .env file.",
            "context_used": False,
        }

    ctx = build_chat_context(db, field_id)

    # Build a rich context block from ML results
    context_lines = [f"Field ID: {field_id}"]

    if ctx["prediction"]:
        p = ctx["prediction"]
        context_lines.append(
            f"\nML Predictions (as of {p['timestamp']}):"
            f"\n  • Soil state: {p['soil_state']} (confidence: {(p['soil_state_confidence'] or 0):.0%})"
            f"\n  • Recommended crop: {p['crop_recommendation']} (confidence: {(p['crop_confidence'] or 0):.0%})"
            f"\n  • Fertilizer: {p['fertilizer_recommendation']} ({p['fertilizer_source']})"
        )
        
        # Add Geographic Soil Context (SoilGrids)
        snapshot = p.get("original_prediction", {}).feature_snapshot if hasattr(p, "get") else None # Prediction model instance
        # Since ctx["prediction"] is a summary dict, we might need to get real data
        # Actually, let's update build_chat_context to include it.
        if "soilgrids" in p:
            s = p["soilgrids"]
            context_lines.append(
                f"\nGeological Context (SoilGrids 250m):"
                f"\n  • Clay: {s.get('clay_content')} g/kg, Sand: {s.get('sand_content')} g/kg"
                f"\n  • pH (H2O): {s.get('phh2o', 0)/10.0:.1f}, Nitrogen: {s.get('nitrogen')} cg/kg"
                f"\n  • Organic Carbon (SOC): {s.get('soc')} dg/kg"
            )
    else:
        context_lines.append("\nNo ML predictions available yet.")

    if ctx["sensor_readings"]:
        context_lines.append("\nLatest sensor readings:")
        for r in ctx["sensor_readings"][:5]:
            context_lines.append(
                f"  Sensor {r['sensor_id']} @ {r['timestamp']}: "
                f"pH={r['pH']}, moisture={r['soil_moisture_pct']}%, "
                f"temp={r['soil_temperature_c']}°C, EC={r['ec_ms_cm']} mS/cm"
            )
    else:
        context_lines.append("\nNo sensor readings available.")

    if ctx["active_recommendations"]:
        context_lines.append("\nActive recommendations:")
        for rec in ctx["active_recommendations"]:
            context_lines.append(f"  [{rec['level'].upper()}] {rec['title']}: {rec['message']}")
    else:
        context_lines.append("\nNo active recommendations.")

    if rich_context:
        context_lines.append("\nUser UI Context (What the farmer is looking at):")
        context_lines.append(f"  • Current Map Depth: {rich_context.get('depth')}")
        context_lines.append(f"  • Active Property Layer: {rich_context.get('property')}")
        if "sensors" in rich_context:
            context_lines.append(f"  • Active Sensors in view: {len(rich_context['sensors'])}")

    context_block = "\n".join(context_lines)

    messages = [
        {
            "role": "user",
            "content": (
                f"<field_data>\n{context_block}\n</field_data>\n\n"
                f"Language required: {language}\n"
                f"Farmer question: {user_message}"
            ),
        }
    ]

    headers = {
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": messages[0]["content"]}
        ],
        "temperature": 0.7,
        "max_tokens": 1024
    }

    try:
        with httpx.Client() as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            reply = data["choices"][0]["message"]["content"]
    except Exception as e:
        reply = f"Error calling Groq API: {str(e)}"
    return {
        "reply": reply,
        "context_used": True,
        "field_id": field_id,
        "ml_prediction": ctx["prediction"],
    }
