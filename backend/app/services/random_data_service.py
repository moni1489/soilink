import random
from datetime import datetime, timezone
from app.models.reading import SensorReading


def generate_mock_reading(sensor_id: str, field_id: str) -> SensorReading:
    ph = round(random.uniform(4.5, 8.0), 1)
    moisture = round(random.uniform(15.0, 60.0), 1)
    temp = round(random.uniform(10.0, 35.0), 1)
    ec = round(random.uniform(0.5, 2.8), 2)
    co2 = round(random.uniform(0.03, 0.12), 2)
    gas = f"N2 {random.randint(75, 78)}%, O2 {random.randint(19, 21)}%, CO2 {co2}%"
    vibro = random.choice([
        None,
        "Loose and stable profile, low compaction risk",
        "Localized layer hardening at 20-30 cm depth",
        "High compaction and microcrack density, intervention required",
    ])

    return SensorReading(
        sensor_id=sensor_id,
        field_id=field_id,
        timestamp=datetime.now(timezone.utc),
        ph=ph,
        soil_temperature=temp,
        soil_moisture=moisture,
        electrical_conductivity=ec,
        gas_composition=gas,
        vibroacoustic=vibro,
    )
