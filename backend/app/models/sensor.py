from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Integer
from app.core.db import Base


class Sensor(Base):
    """Реестр физических датчиков. id — код на наклейке и в QR, не меняется;
    dev_eui — адрес LoRaWAN, по нему вебхук хаба находит датчик."""
    __tablename__ = "sensors"

    id = Column(String, primary_key=True)
    dev_eui = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    field_id = Column(String, nullable=False, index=True)
    model = Column(String, default="")
    depth_cm = Column(Integer, default=20)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    notes = Column(String, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
