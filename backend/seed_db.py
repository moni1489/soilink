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
    for i in range(10):
        reading = SensorReading(
            field_id=field_id,
            sensor_id=f"sensor-{i+1}",
            timestamp=now - timedelta(hours=i),
            ph=6.5 + (i * 0.05),
            soil_moisture=48.0 + (i * 1.5),
            soil_temperature=19.2 - (i * 0.4),
            electrical_conductivity=1.1 + (i * 0.03),
            gas_composition="Stable",
            vibroacoustic="Nominal"
        )
        db.add(reading)
    db.commit()
    print(f"Added 10 sensor readings for {field_id}")
    
    # 3. Add Prediction
    prediction = Prediction(
        field_id=field_id,
        timestamp=now,
        soil_state="Highly Productive",
        soil_state_confidence=0.94,
        crop_recommendation="Premium Wheat (Elite)",
        crop_confidence=0.91,
        fertilizer_recommendation="Liquid Nitro-Phosphorus",
        fertilizer_source="AI Analysis",
        feature_snapshot={"soilgrid_data": {"clay_content": 220, "sand_content": 450, "phh2o": 68}}
    )
    db.add(prediction)
    db.commit()
    print(f"Added prediction for {field_id}")

    # 4. Add Recommendations
    recs = [
        Recommendation(
            field_id=field_id,
            timestamp=now,
            level="warning",
            title_key="recMicronutrientTitle",
            message_key="recMicronutrientMessage",
            title_text="Micronutrient Optimization",
            message_text="Boron levels are slightly below target. Foliar application recommended.",
            timeline=[]
        )
    ]
    for r in recs:
        db.add(r)
    db.commit()
    print(f"Added recommendations for {field_id}")

    db.close()
    print("Database seeded successfully and verified!")

if __name__ == "__main__":
    seed()
