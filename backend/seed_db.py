import sys
import os
from datetime import datetime, timedelta

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal, engine, Base
from app.models.field import Field
from app.models.reading import SensorReading
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation

def seed():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Create Field
    field_id = "field-1"
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        field = Field(
            id=field_id,
            name="North Sector",
            latitude=51.5074,
            longitude=-0.1278,
            area_hectares=12.5
        )
        db.add(field)
        db.commit()
        print(f"Created field: {field_id}")

    # 2. Add Sensor Readings
    now = datetime.utcnow()
    for i in range(5):
        reading = SensorReading(
            field_id=field_id,
            sensor_id=f"sensor-{i+1}",
            timestamp=now - timedelta(hours=i),
            ph=6.5 + (i * 0.1),
            soil_moisture=45.0 + (i * 2),
            soil_temperature=18.0 - (i * 0.5),
            electrical_conductivity=1.2 + (i * 0.05),
            gas_composition="Normal",
            vibroacoustic="Steady"
        )
        db.add(reading)
    
    # 3. Add Prediction
    prediction = Prediction(
        field_id=field_id,
        timestamp=now,
        soil_state="Stable",
        soil_state_confidence=0.92,
        crop_recommendation="Wheat",
        crop_confidence=0.88,
        fertilizer_recommendation="NPK 15-15-15",
        fertilizer_source="Based on low Nitrogen levels"
    )
    db.add(prediction)

    # 4. Add Recommendations
    recs = [
        Recommendation(
            field_id=field_id,
            timestamp=now,
            level="critical",
            title_text="Irregular Moisture Detected",
            message_text="Section B-4 shows 15% lower moisture than average. Check irrigation valves.",
            timeline=[{"id": "step1", "labelKey": "Check valves", "dueAt": "Today", "completed": False}]
        ),
        Recommendation(
            field_id=field_id,
            timestamp=now - timedelta(days=1),
            level="premium",
            title_text="Optimal Planting Window",
            message_text="Soil temperature and moisture are ideal for sowing wheat over the next 48 hours.",
            timeline=[]
        )
    ]
    for r in recs:
        db.add(r)

    db.commit()
    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
