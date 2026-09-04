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
    
    # 1. Create Fields
    initial_fields = [
        {"id": "f-1", "name": "УКГ — Тишинское поле", "latitude": 49.9260, "longitude": 82.5420, "area_hectares": 124.5},
        {"id": "f-2", "name": "УКГ — Усть-Тарханское поле", "latitude": 49.8920, "longitude": 82.6380, "area_hectares": 86.2},
        {"id": "field-1", "name": "North Sector", "latitude": 51.5074, "longitude": -0.1278, "area_hectares": 12.5},
    ]
    for f_info in initial_fields:
        f_obj = db.query(Field).filter(Field.id == f_info["id"]).first()
        if not f_obj:
            f_obj = Field(**f_info)
            db.add(f_obj)
            db.commit()
            print(f"Created field: {f_info['id']}")

    # 2. Add Sensor Readings
    now = datetime.utcnow()
    for field_id in ["f-1", "field-1"]:
        for i in range(10):
            reading = SensorReading(
                field_id=field_id,
                sensor_id=f"{field_id}-sensor-{i+1}",
                timestamp=now - timedelta(hours=i),
                ph=6.5 + (i * 0.05),
                soil_moisture=48.0 + (i * 1.5),
                soil_temperature=19.2 - (i * 0.4),
                electrical_conductivity=1.1 + (i * 0.03),
                gas_composition="Stable",
                vibroacoustic="Nominal"
            )
            db.add(reading)
        print(f"Added 10 sensor readings for {field_id}")
    db.commit()
    
    # 3. Add Predictions & Recommendations
    for f_id in ["f-1", "field-1"]:
        prediction = Prediction(
            field_id=f_id,
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

        rec = Recommendation(
            field_id=f_id,
            timestamp=now,
            level="warning",
            title_key="recMicronutrientTitle",
            message_key="recMicronutrientMessage",
            title_text="Micronutrient Optimization",
            message_text="Boron levels are slightly below target. Foliar application recommended.",
            timeline=[]
        )
        db.add(rec)
    db.commit()
    print("Added predictions and recommendations for fields")

    db.close()
    print("Database seeded successfully and verified!")

if __name__ == "__main__":
    seed()
