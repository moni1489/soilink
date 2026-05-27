from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TimelineStepOut(BaseModel):
    id: str
    label_key: str
    label_text: str
    due_at: str
    completed: bool


class RecommendationOut(BaseModel):
    id: int
    field_id: str
    sensor_id: Optional[str] = None
    level: str
    title_key: str
    message_key: str
    title_text: str
    message_text: str
    timeline: list[TimelineStepOut]
    timestamp: datetime

    model_config = {"from_attributes": True}
