from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PremiumFeatures(BaseModel):
    vibroacoustic_soil_structure_analysis: Optional[str] = Field(
        None, alias="vibroacousticSoilStructureAnalysis"
    )


class SensorReadingIn(BaseModel):
    sensor_id: str = Field(..., alias="sensorId")
    field_id: str = Field(..., alias="fieldId")
    ph: float = Field(..., alias="pH")
    soil_temperature: float = Field(..., alias="soilTemperature")
    soil_moisture: float = Field(..., alias="soilMoisture")
    electrical_conductivity: float = Field(..., alias="electricalConductivity")
    gas_composition: str = Field(..., alias="gasComposition")
    premium_features: Optional[PremiumFeatures] = Field(None, alias="premiumFeatures")

    model_config = {"populate_by_name": True}


class SensorReadingOut(BaseModel):
    id: int
    sensor_id: str
    field_id: str
    timestamp: datetime
    ph: float
    soil_temperature: float
    soil_moisture: float
    electrical_conductivity: float
    gas_composition: str
    vibroacoustic: Optional[str] = None

    model_config = {"from_attributes": True}
