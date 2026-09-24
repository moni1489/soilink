from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer
from app.core.db import Base, JSONType


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String, nullable=False, index=True)
    sensor_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    crop_recommendation = Column(String, nullable=True)
    crop_confidence = Column(Float, nullable=True)
    fertilizer_recommendation = Column(String, nullable=True)
    fertilizer_source = Column(String, default="rule_based")
    soil_state = Column(String, nullable=True)
    soil_state_confidence = Column(Float, nullable=True)
    feature_snapshot = Column(JSONType, nullable=True)
