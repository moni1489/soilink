from sqlalchemy.orm import Session

from app.models.reading import SensorReading
from app.models.field import Field
from app.models.prediction import Prediction
from app.ml.inference import predict_crop, predict_fertilizer_ml
from app.ml import soil_models
from app.services.feature_service import build_crop_features, build_fertilizer_features
from app.services.climate_service import get_climate
from app.utils.rules import rule_based_fertilizer


def run_inference(db: Session, field_id: str, sensor_id: str | None = None) -> Prediction:
    query = db.query(SensorReading).filter(SensorReading.field_id == field_id)
    if sensor_id:
        query = query.filter(SensorReading.sensor_id == sensor_id)
    reading = query.order_by(SensorReading.timestamp.desc()).first()

    if reading is None:
        raise ValueError(f"No readings found for field={field_id}")

    field = db.query(Field).filter(Field.id == field_id).first()
    if field is None:
        field = Field(
            id=field_id, name=field_id,
            soil_type="Loamy", crop_type="Wheat",
            nitrogen=40.0, phosphorus=40.0, potassium=40.0,
            humidity=60.0, rainfall=100.0,
        )
        db.add(field)
        db.flush()

    # Use live SoilGrids data if coordinates are available; fall back to soil-type defaults
    from app.services.soilgrid_service import get_soilgrid_properties
    soilgrid = get_soilgrid_properties(field.latitude, field.longitude, field.soil_type)

    crop_features = build_crop_features(reading, field, soilgrid)
    fert_features = build_fertilizer_features(reading, field)

    crop_result = predict_crop(**crop_features)
    crop_name = crop_result[0] if crop_result else None
    crop_conf = crop_result[1] if crop_result else None

    fertilizer_ml = predict_fertilizer_ml(**fert_features)
    fertilizer_rule = rule_based_fertilizer(field.nitrogen, field.phosphorus, field.potassium)
    fertilizer_name = fertilizer_ml if fertilizer_ml else fertilizer_rule
    fertilizer_source = "ml" if fertilizer_ml else "rule_based"

    # Модели состояния почвы обучены на реальных лабораторных измерениях
    # (Supplement 2, транссект по Казахстану). Им нужны климатические нормы
    # по координатам поля — те же, что использовались при обучении.
    climate = get_climate(field.latitude, field.longitude)
    soil_features = soil_models.build_features(
        ph=reading.ph,
        electrical_conductivity=reading.electrical_conductivity,
        soil_moisture=reading.soil_moisture,
        soilgrid=soilgrid,
        climate=climate,
        latitude=field.latitude,
        longitude=field.longitude,
        crop_type=field.crop_type,
    )

    state_result = soil_models.predict_soil_state(soil_features)
    soil_state = state_result["state"] if state_result else None
    soil_state_conf = state_result["confidence"] if state_result else None

    # Точка вне транссекта, на котором обучались модели: географические
    # признаки экстраполируются, поэтому доверие к прогнозу снижается.
    # Прогноз не выбрасывается — он помечается, решение остаётся за фронтендом.
    in_domain = soil_models.in_training_domain(field.latitude, field.longitude)
    if soil_state_conf is not None and not in_domain:
        soil_state_conf *= 0.5

    prediction = Prediction(
        field_id=field_id,
        sensor_id=reading.sensor_id,
        crop_recommendation=crop_name,
        crop_confidence=crop_conf,
        fertilizer_recommendation=fertilizer_name,
        fertilizer_source=fertilizer_source,
        soil_state=soil_state,
        soil_state_confidence=soil_state_conf,
        feature_snapshot={
            "crop_features": crop_features,
            "fert_features": fert_features,
            "soil_state_features": soil_features,
            "soilgrid_data": soilgrid,
            "climate": climate,
            "fertilizer_ml_output": fertilizer_ml,
            "fertilizer_rule_output": fertilizer_rule,
            # Дополнительные выходы новых моделей. Кладутся в snapshot,
            # а не в отдельные колонки, чтобы не требовалась миграция БД.
            "soil_state_probabilities": state_result["probabilities"] if state_result else None,
            "predicted_nitrogen_g_kg": soil_models.predict_nitrogen(soil_features),
            "predicted_carbon_g_kg": soil_models.predict_carbon(soil_features),
            "predicted_moisture_pct": soil_models.predict_moisture(soil_features),
            # Модель pH обучена без самого pH, поэтому расхождение с показанием
            # датчика — независимый сигнал о возможном дрейфе электрода.
            "predicted_ph": soil_models.predict_ph(soil_features),
            "in_training_domain": in_domain,
        },
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction
