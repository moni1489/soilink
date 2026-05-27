from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.reading import SensorReading
from app.schemas.reading import SensorReadingIn, SensorReadingOut

router = APIRouter(prefix="/api/readings", tags=["readings"])


@router.post("", response_model=SensorReadingOut)
def ingest_reading(payload: SensorReadingIn, db: Session = Depends(get_db)):
    vibro = None
    if payload.premium_features and payload.premium_features.vibroacoustic_soil_structure_analysis:
        vibro = payload.premium_features.vibroacoustic_soil_structure_analysis

    reading = SensorReading(
        sensor_id=payload.sensor_id,
        field_id=payload.field_id,
        ph=payload.ph,
        soil_temperature=payload.soil_temperature,
        soil_moisture=payload.soil_moisture,
        electrical_conductivity=payload.electrical_conductivity,
        gas_composition=payload.gas_composition,
        vibroacoustic=vibro,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.post("/batch", response_model=list[SensorReadingOut])
def ingest_batch(payloads: list[SensorReadingIn], db: Session = Depends(get_db)):
    results = []
    for payload in payloads:
        vibro = None
        if payload.premium_features and payload.premium_features.vibroacoustic_soil_structure_analysis:
            vibro = payload.premium_features.vibroacoustic_soil_structure_analysis

        reading = SensorReading(
            sensor_id=payload.sensor_id,
            field_id=payload.field_id,
            ph=payload.ph,
            soil_temperature=payload.soil_temperature,
            soil_moisture=payload.soil_moisture,
            electrical_conductivity=payload.electrical_conductivity,
            gas_composition=payload.gas_composition,
            vibroacoustic=vibro,
        )
        db.add(reading)
        results.append(reading)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.get("/latest", response_model=list[SensorReadingOut])
def get_latest_readings(field_id: str, db: Session = Depends(get_db)):
    from sqlalchemy import func

    subq = (
        db.query(
            SensorReading.sensor_id,
            func.max(SensorReading.id).label("max_id"),
        )
        .filter(SensorReading.field_id == field_id)
        .group_by(SensorReading.sensor_id)
        .subquery()
    )
    readings = (
        db.query(SensorReading)
        .join(subq, SensorReading.id == subq.c.max_id)
        .all()
    )
    return readings


@router.get("/{reading_id}", response_model=SensorReadingOut)
def get_reading(reading_id: int, db: Session = Depends(get_db)):
    reading = db.query(SensorReading).filter(SensorReading.id == reading_id).first()
    if not reading:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Reading not found")
    return reading
