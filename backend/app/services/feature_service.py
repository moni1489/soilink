from app.models.reading import SensorReading
from app.models.field import Field

SOIL_TYPE_ORDER = ["Sandy", "Loamy", "Clayey", "Black", "Red"]


def _soil_type_enc(soil_type: str) -> float:
    try:
        return float(SOIL_TYPE_ORDER.index(soil_type))
    except ValueError:
        return 1.0  # default to Loamy index


def build_crop_features(reading: SensorReading, field: Field, soilgrid: dict | None = None) -> dict:
    features = {
        "nitrogen": field.nitrogen,
        "phosphorus": field.phosphorus,
        "potassium": field.potassium,
        "temperature": reading.soil_temperature,
        "humidity": field.humidity,
        "ph": reading.ph,
        "rainfall": field.rainfall,
        "soil_type_enc": _soil_type_enc(field.soil_type),
    }
    if soilgrid:
        features.update({
            "clay_content": soilgrid.get("clay_content", 220),
            "sand_content": soilgrid.get("sand_content", 420),
            "silt_content": soilgrid.get("silt_content", 360),
            "soc":  soilgrid.get("soc",  25),
            "cec":  soilgrid.get("cec",  180),
            "bdod": soilgrid.get("bdod", 135),
        })
    return features


def build_fertilizer_features(reading: SensorReading, field: Field) -> dict:
    return {
        "temperature": reading.soil_temperature,
        "humidity": field.humidity,
        "moisture": reading.soil_moisture,
        "soil_type": field.soil_type,
        "crop_type": field.crop_type,
    }


def build_soil_state_features(reading: SensorReading, field: Field, soilgrid: dict) -> dict:
    """
    Build the full feature vector for the soil state classifier.
    Combines live sensor readings with SoilGrids physical composition.
    """
    return {
        "N":  field.nitrogen,
        "P":  field.phosphorus,
        "K":  field.potassium,
        "pH": reading.ph,
        "soil_moisture":          reading.soil_moisture,
        "soil_temperature":       reading.soil_temperature,
        "electrical_conductivity": reading.electrical_conductivity,
        "humidity":    field.humidity,
        "rainfall":    field.rainfall,
        "soil_type_enc": _soil_type_enc(field.soil_type),
        # SoilGrids physical composition
        "clay_content": soilgrid.get("clay_content", 220),
        "sand_content": soilgrid.get("sand_content", 420),
        "silt_content": soilgrid.get("silt_content", 360),
        "soc":  soilgrid.get("soc",  25),
        "cec":  soilgrid.get("cec",  180),
        "bdod": soilgrid.get("bdod", 135),
    }
