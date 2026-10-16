from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.reading import SensorReading
from app.models.sensor import Sensor
from app.schemas.reading import SensorReadingOut

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


class SensorIn(BaseModel):
    name: str
    field_id: str
    dev_eui: Optional[str] = None
    model: str = ""
    depth_cm: int = 20
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: str = ""


class SensorUpdate(BaseModel):
    name: Optional[str] = None
    field_id: Optional[str] = None
    dev_eui: Optional[str] = None
    model: Optional[str] = None
    depth_cm: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class SensorOut(BaseModel):
    id: str
    name: str
    field_id: str
    dev_eui: Optional[str] = None
    model: str
    depth_cm: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: str
    created_at: datetime
    readings_count: int = 0
    last_reading: Optional[SensorReadingOut] = None

    model_config = {"from_attributes": True}


def _normalize_eui(eui: Optional[str]) -> Optional[str]:
    # Хаб шлёт DevEUI в нижнем регистре без разделителей, на наклейке бывает «24:E1:24…»
    eui = (eui or "").replace(":", "").replace("-", "").replace(" ", "").lower()
    return eui or None


def _out(db: Session, sensor: Sensor) -> SensorOut:
    q = db.query(SensorReading).filter(SensorReading.sensor_id == sensor.id)
    out = SensorOut.model_validate(sensor)
    out.readings_count = q.count()
    last = q.order_by(SensorReading.timestamp.desc()).first()
    out.last_reading = SensorReadingOut.model_validate(last) if last else None
    return out


def _get(db: Session, sensor_id: str) -> Sensor:
    sensor = db.get(Sensor, sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor


def _adopt_orphans(db: Session, sensor: Sensor):
    """Пакеты, пришедшие с хаба до регистрации DevEUI, записаны под самим DevEUI — забираем их."""
    if sensor.dev_eui:
        db.query(SensorReading).filter(SensorReading.sensor_id == sensor.dev_eui).update(
            {"sensor_id": sensor.id, "field_id": sensor.field_id}
        )


def _set_eui(db: Session, sensor: Sensor, eui: Optional[str]):
    eui = _normalize_eui(eui)
    if eui and db.query(Sensor).filter(Sensor.dev_eui == eui, Sensor.id != sensor.id).first():
        raise HTTPException(status_code=409, detail="DevEUI already registered")
    sensor.dev_eui = eui


@router.get("", response_model=list[SensorOut])
def list_sensors(field_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Sensor)
    if field_id:
        q = q.filter(Sensor.field_id == field_id)
    # ponytail: по 2 запроса на датчик, хватит на сотни; оконная функция, если реестр вырастет
    return [_out(db, s) for s in q.order_by(Sensor.id).all()]


@router.post("", response_model=SensorOut)
def create_sensor(payload: SensorIn, db: Session = Depends(get_db)):
    # Следующий свободный код SL-0001, SL-0002… — он печатается на наклейке
    n = max([int(i[3:]) for (i,) in db.query(Sensor.id).filter(Sensor.id.like("SL-%")) if i[3:].isdigit()] or [0])
    sensor = Sensor(id=f"SL-{n + 1:04d}", **payload.model_dump(exclude={"dev_eui"}))
    _set_eui(db, sensor, payload.dev_eui)
    db.add(sensor)
    db.flush()
    _adopt_orphans(db, sensor)
    db.commit()
    return _out(db, sensor)


@router.get("/{sensor_id}", response_model=SensorOut)
def get_sensor(sensor_id: str, db: Session = Depends(get_db)):
    return _out(db, _get(db, sensor_id))


@router.patch("/{sensor_id}", response_model=SensorOut)
def update_sensor(sensor_id: str, payload: SensorUpdate, db: Session = Depends(get_db)):
    sensor = _get(db, sensor_id)
    data = payload.model_dump(exclude_unset=True)
    if "dev_eui" in data:
        _set_eui(db, sensor, data.pop("dev_eui"))
    for key, val in data.items():
        setattr(sensor, key, val)
    if "field_id" in data:
        db.query(SensorReading).filter(SensorReading.sensor_id == sensor.id).update({"field_id": sensor.field_id})
    _adopt_orphans(db, sensor)
    db.commit()
    return _out(db, sensor)


@router.delete("/{sensor_id}")
def delete_sensor(sensor_id: str, db: Session = Depends(get_db)):
    # Показания не удаляем — история остаётся в базе и вернётся, если датчик зарегистрируют снова
    db.delete(_get(db, sensor_id))
    db.commit()
    return {"deleted": True}


@router.get("/{sensor_id}/readings", response_model=list[SensorReadingOut])
def sensor_readings(sensor_id: str, hours: int = 168, db: Session = Depends(get_db)):
    _get(db, sensor_id)
    since = datetime.now(timezone.utc) - timedelta(hours=min(hours, 24 * 365))
    return (
        db.query(SensorReading)
        .filter(SensorReading.sensor_id == sensor_id, SensorReading.timestamp >= since)
        .order_by(SensorReading.timestamp)
        .all()
    )
