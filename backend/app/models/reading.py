from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer
from app.core.db import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(String, nullable=False, index=True)
    field_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ph = Column(Float)
    soil_temperature = Column(Float)
    soil_moisture = Column(Float)
    electrical_conductivity = Column(Float)
    gas_composition = Column(String)
    vibroacoustic = Column(String, nullable=True)
