from app.models.reading import SensorReading
from app.models.field import Field


def build_crop_features(reading: SensorReading, field: Field) -> dict:
    return {
        "nitrogen": field.nitrogen,
        "phosphorus": field.phosphorus,
        "potassium": field.potassium,
        "temperature": reading.soil_temperature,
        "humidity": field.humidity,
        "ph": reading.ph,
        "rainfall": field.rainfall,
    }


def build_fertilizer_features(reading: SensorReading, field: Field) -> dict:
    return {
        "temperature": reading.soil_temperature,
        "humidity": field.humidity,
        "moisture": reading.soil_moisture,
        "soil_type": field.soil_type,
        "crop_type": field.crop_type,
    }
