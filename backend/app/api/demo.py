from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.random_data_service import seed_random_scenario

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.post("/seed")
def seed_demo_field(
    field_id: Optional[str] = Query(None, description="Reuse existing field or leave blank to create new"),
    n_sensors: int = Query(3, ge=1, le=10, description="Number of virtual sensors"),
    readings_per_sensor: int = Query(5, ge=1, le=20, description="Readings per sensor"),
    language: str = Query("en", description="Language for Groq summary (en / ru / kk)"),
    db: Session = Depends(get_db),
):
    """
    Generate random field + sensor readings, run ML prediction pipeline,
    and return a Groq-powered plain-language scenario summary.
    """
    return seed_random_scenario(
        db=db,
        field_id=field_id,
        n_sensors=n_sensors,
        readings_per_sensor=readings_per_sensor,
        language=language,
    )
