from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, JSON
from app.core.db import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    field_id = Column(String, nullable=False, index=True)
    sensor_id = Column(String, nullable=True)
    level = Column(String, nullable=False)  # critical, warning, plan, premium
    title_key = Column(String, nullable=False)
    message_key = Column(String, nullable=False)
    title_text = Column(String, nullable=False)
    message_text = Column(String, nullable=False)
    timeline = Column(JSON, default=list)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
