from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.field import Field

router = APIRouter(prefix="/api/fields", tags=["fields"])


class FieldIn(BaseModel):
    id: str
    name: str
    area_hectares: float = 0.0
    soil_type: str = "Loamy"
    crop_type: str = "Wheat"
    nitrogen: float = 40.0
    phosphorus: float = 40.0
    potassium: float = 40.0
    humidity: float = 60.0
    rainfall: float = 100.0


class FieldOut(BaseModel):
    id: str
    name: str
    area_hectares: float
    soil_type: str
    crop_type: str
    nitrogen: float
    phosphorus: float
    potassium: float
    humidity: float
    rainfall: float

    model_config = {"from_attributes": True}


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    soil_type: Optional[str] = None
    crop_type: Optional[str] = None
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None


@router.get("", response_model=list[FieldOut])
def list_fields(db: Session = Depends(get_db)):
    return db.query(Field).all()


@router.post("", response_model=FieldOut)
def create_field(payload: FieldIn, db: Session = Depends(get_db)):
    existing = db.query(Field).filter(Field.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Field already exists")
    field = Field(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.patch("/{field_id}", response_model=FieldOut)
def update_field(field_id: str, payload: FieldUpdate, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(field, key, val)
    db.commit()
    db.refresh(field)
    return field


@router.get("/{field_id}", response_model=FieldOut)
def get_field(field_id: str, db: Session = Depends(get_db)):
    field = db.query(Field).filter(Field.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field
