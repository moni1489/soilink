from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.recommendation import Recommendation
from app.schemas.recommendation import RecommendationOut, TimelineStepOut

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _format_rec(rec: Recommendation) -> dict:
    timeline = []
    if rec.timeline:
        for step in rec.timeline:
            timeline.append(TimelineStepOut(
                id=step["id"],
                label_key=step.get("label_key", ""),
                label_text=step.get("label_text", ""),
                due_at=step.get("due_at", ""),
                completed=step.get("completed", False),
            ))
    return RecommendationOut(
        id=rec.id,
        field_id=rec.field_id,
        sensor_id=rec.sensor_id,
        level=rec.level,
        title_key=rec.title_key,
        message_key=rec.message_key,
        title_text=rec.title_text,
        message_text=rec.message_text,
        timeline=timeline,
        timestamp=rec.timestamp,
    )


@router.get("/latest", response_model=list[dict])
def get_latest_recommendations(field_id: str, db: Session = Depends(get_db)):
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.field_id == field_id)
        .order_by(Recommendation.timestamp.desc())
        .limit(20)
        .all()
    )
    if not recs:
        raise HTTPException(status_code=404, detail="No recommendations found")
    return [_format_rec(r).model_dump() for r in recs]
