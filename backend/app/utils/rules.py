PH_LOW = 5.5
PH_HIGH = 7.5
MOISTURE_LOW = 25.0
MOISTURE_HIGH = 70.0
TEMP_LOW = 5.0
TEMP_HIGH = 35.0
EC_HIGH = 2.0

SOIL_TYPES = ["Sandy", "Loamy", "Clayey", "Black", "Red"]
CROP_TYPES = [
    "Maize", "Sugarcane", "Cotton", "Paddy", "Barley",
    "Millets", "Wheat", "Tobacco", "Oil seeds", "Ground Nuts", "Pulses",
]
FERTILIZER_NAMES = ["10-26-26", "14-35-14", "17-17-17", "20-20", "28-28", "DAP", "Urea"]

NPK_FERTILIZER_MAP = {
    "high_n": "Urea",
    "high_p": "DAP",
    "high_k": "28-28",
    "balanced_low": "17-17-17",
    "balanced_high": "20-20",
    "high_pk": "10-26-26",
    "high_np": "14-35-14",
}


def rule_based_fertilizer(nitrogen: float, phosphorus: float, potassium: float) -> str:
    n, p, k = nitrogen, phosphorus, potassium
    if n > 80 and p < 40 and k < 40:
        return NPK_FERTILIZER_MAP["high_n"]
    if p > 80 and n < 40 and k < 40:
        return NPK_FERTILIZER_MAP["high_p"]
    if k > 80 and n < 40 and p < 40:
        return NPK_FERTILIZER_MAP["high_k"]
    if p > 60 and k > 60 and n < 40:
        return NPK_FERTILIZER_MAP["high_pk"]
    if n > 60 and p > 60 and k < 40:
        return NPK_FERTILIZER_MAP["high_np"]
    if n > 60 and p > 60 and k > 60:
        return NPK_FERTILIZER_MAP["balanced_high"]
    return NPK_FERTILIZER_MAP["balanced_low"]


def classify_sensor_status(ph: float, moisture: float, temp: float, ec: float) -> str:
    critical = (
        ph < PH_LOW - 0.5
        or moisture < MOISTURE_LOW - 5
        or temp > TEMP_HIGH + 3
        or ec > EC_HIGH + 0.3
    )
    if critical:
        return "critical"
    warning = (
        ph < PH_LOW or ph > PH_HIGH
        or moisture < MOISTURE_LOW
        or temp > TEMP_HIGH or temp < TEMP_LOW
        or ec > EC_HIGH
    )
    if warning:
        return "warning"
    return "healthy"
