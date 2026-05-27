from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionOut, InferenceRequest
from app.services.prediction_service import run_inference
from app.services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.post("/run", response_model=PredictionOut)
def trigger_inference(req: InferenceRequest, db: Session = Depends(get_db)):
    try:
        prediction = run_inference(db, req.field_id, req.sensor_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    generate_recommendations(db, req.field_id, prediction)
    return prediction


@router.get("/latest", response_model=PredictionOut)
def get_latest_prediction(field_id: str, db: Session = Depends(get_db)):
    prediction = (
        db.query(Prediction)
        .filter(Prediction.field_id == field_id)
        .order_by(Prediction.timestamp.desc())
        .first()
    )
    if not prediction:
        raise HTTPException(status_code=404, detail="No predictions found")
    return prediction
