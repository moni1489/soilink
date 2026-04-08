from sqlalchemy import Column, String, Float
from app.core.db import Base


class Field(Base):
    __tablename__ = "fields"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    area_hectares = Column(Float, default=0.0)
    soil_type = Column(String, default="Loamy")
    crop_type = Column(String, default="Wheat")
    nitrogen = Column(Float, default=40.0)
    phosphorus = Column(Float, default=40.0)
    potassium = Column(Float, default=40.0)
    humidity = Column(Float, default=60.0)
    rainfall = Column(Float, default=100.0)
