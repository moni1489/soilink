from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer, JSON
from app.core.db import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String, nullable=False, index=True)
    sensor_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    crop_recommendation = Column(String, nullable=True)
    crop_confidence = Column(Float, nullable=True)
    fertilizer_recommendation = Column(String, nullable=True)
    fertilizer_source = Column(String, default="rule_based")
    feature_snapshot = Column(JSON, nullable=True)
