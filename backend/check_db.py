import sys
import os
from datetime import datetime

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal, engine, Base
from app.models.field import Field
from app.models.reading import SensorReading
from app.models.prediction import Prediction
from app.models.recommendation import Recommendation

def check():
    db = SessionLocal()
    
    print(f"Database URL: {engine.url}")
    
    fields = db.query(Field).all()
    print(f"Total Fields: {len(fields)}")
    for f in fields:
        print(f"Field: {f.id} ({f.name})")
        
    readings = db.query(SensorReading).all()
    print(f"Total Sensor Readings: {len(readings)}")
    if readings:
        print(f"Last reading timestamp: {readings[-1].timestamp}")
        
    preds = db.query(Prediction).all()
    print(f"Total Predictions: {len(preds)}")
    
    recs = db.query(Recommendation).all()
    print(f"Total Recommendations: {len(recs)}")
    
    db.close()

if __name__ == "__main__":
    check()
