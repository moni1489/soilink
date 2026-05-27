from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class InferenceRequest(BaseModel):
    field_id: str
    sensor_id: Optional[str] = None


class PredictionOut(BaseModel):
    id: int
    field_id: str
    sensor_id: Optional[str] = None
    timestamp: datetime
    crop_recommendation: Optional[str] = None
    crop_confidence: Optional[float] = None
    fertilizer_recommendation: Optional[str] = None
    fertilizer_source: str = "rule_based"
    soil_state: Optional[str] = None
    soil_state_confidence: Optional[float] = None
    feature_snapshot: Optional[dict] = None

    model_config = {"from_attributes": True}
