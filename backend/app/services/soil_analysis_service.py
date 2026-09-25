from typing import Any, Dict, List

# Вывод анализа отдаётся кодами (*_code, limitation_codes, recommendation_codes),
# чтобы фронтенд сам подставил перевод. Русские строки остаются для совместимости
# со старыми клиентами.

TEXTURE_LABELS: Dict[str, str] = {
    "unknown": "Неизвестно",
    "clay": "Глина (Clay)",
    "silty_clay": "Тяжелый суглинок (Silty Clay)",
    "sandy_clay": "Песчаная глина (Sandy Clay)",
    "sandy_clay_loam": "Песчано-глинистый суглинок (Sandy Clay Loam)",
    "silty_clay_loam": "Илисто-глинистый суглинок (Silty Clay Loam)",
    "clay_loam": "Глинистый суглинок (Clay Loam)",
    "silt": "Ил (Silt)",
    "silt_loam": "Илистый суглинок (Silt Loam)",
    "sand": "Песок (Sand)",
    "loamy_sand": "Супесь (Loamy Sand)",
    "sandy_loam": "Песчаный суглинок (Sandy Loam)",
    "loam": "Суглинок (Loam)",
}

PH_STATUS_LABELS: Dict[str, str] = {
    "strongly_acidic": "Сильнокислая",
    "slightly_acidic": "Слабокислая",
    "neutral": "Нейтральная",
    "alkaline": "Щелочная",
}

SOC_STATUS_LABELS: Dict[str, str] = {
    "low": "Низкое",
    "medium": "Среднее",
    "high": "Высокое",
}

LIMITATION_LABELS: Dict[str, str] = {
    "clay_drainage": "Высокая плотность почвы, возможны проблемы с дренажем.",
    "sand_leaching": "Низкая влагоемкость, быстрое вымывание питательных веществ.",
    "low_ph": "Пониженный pH ({ph}) блокирует усвоение фосфора.",
    "high_ph": "Повышенный pH ({ph}) может привести к дефициту железа и цинка.",
}

RECOMMENDATION_LABELS: Dict[str, str] = {
    "clay_deep_till": "Рассмотрите глубокое рыхление. Избегайте обработки во влажном состоянии.",
    "sand_frequent_irrigation": (
        "Рекомендуется частое дробное орошение и внесение органических удобрений "
        "для удержания влаги."
    ),
    "texture_optimal": "Оптимальный гранулометрический состав для большинства сельскохозяйственных культур.",
    "ph_liming": "Требуется известкование (внесение доломитовой муки или мела) перед посадкой.",
    "ph_acidic_fertilizer": "Используйте физиологически кислые удобрения (например, сульфат аммония).",
    "soc_critical": (
        "Критически низкий уровень гумуса. Обязательно внесение навоза, компоста "
        "или посев сидератов."
    ),
    "soc_maintain": "Поддерживайте текущий уровень органики пожнивными остатками.",
}

# Группы текстур для правил ниже — раньше определялись поиском подстроки в названии
CLAYEY_TEXTURES = {"clay", "silty_clay", "sandy_clay", "sandy_clay_loam", "silty_clay_loam", "clay_loam"}
SANDY_TEXTURES = {"sand", "loamy_sand", "sandy_loam"}


def get_texture_code(sand: float, silt: float, clay: float) -> str:
    """
    Determine USDA soil texture class based on sand, silt, and clay percentages.
    Note: SoilGrids values are usually in g/kg (divide by 10 for %).
    """
    # Convert g/kg to percentage
    sand_pct = sand / 10.0
    silt_pct = silt / 10.0
    clay_pct = clay / 10.0

    # Normalize just in case they don't perfectly add up to 100
    total = sand_pct + silt_pct + clay_pct
    if total == 0:
        return "unknown"

    sand_pct = (sand_pct / total) * 100
    silt_pct = (silt_pct / total) * 100
    clay_pct = (clay_pct / total) * 100

    if clay_pct >= 40:
        if sand_pct <= 45 and silt_pct < 40:
            return "clay"
        if silt_pct >= 40:
            return "silty_clay"
        return "sandy_clay"

    if clay_pct >= 27:
        if sand_pct >= 45:
            return "sandy_clay_loam"
        if silt_pct >= 50:
            return "silty_clay_loam"
        return "clay_loam"

    if silt_pct >= 80 and clay_pct < 12:
        return "silt"
    if silt_pct >= 50 and clay_pct < 27:
        return "silt_loam"

    if sand_pct >= 85:
        return "sand"
    if sand_pct >= 70:
        return "loamy_sand"
    if sand_pct >= 52 and clay_pct <= 20:
        return "sandy_loam"

    return "loam"


def get_texture_class(sand: float, silt: float, clay: float) -> str:
    """Русское название класса текстуры (оставлено для совместимости)."""
    return TEXTURE_LABELS[get_texture_code(sand, silt, clay)]


def analyze_soil(soil_data: Dict[str, float]) -> Dict[str, Any]:
    """
    Analyzes raw SoilGrids properties and generates actionable agronomic insights.
    """
    recommendation_codes: List[Dict[str, Any]] = []
    limitation_codes: List[Dict[str, Any]] = []

    # 1. Texture Analysis
    texture_code = get_texture_code(
        soil_data.get("sand_content", 0),
        soil_data.get("silt_content", 0),
        soil_data.get("clay_content", 0),
    )

    if texture_code in CLAYEY_TEXTURES:
        limitation_codes.append({"code": "clay_drainage", "params": {}})
        recommendation_codes.append({"code": "clay_deep_till", "params": {}})
    elif texture_code in SANDY_TEXTURES:
        limitation_codes.append({"code": "sand_leaching", "params": {}})
        recommendation_codes.append({"code": "sand_frequent_irrigation", "params": {}})
    else:
        recommendation_codes.append({"code": "texture_optimal", "params": {}})

    # 2. pH Analysis
    ph_raw = soil_data.get("phh2o", 65)
    ph = ph_raw / 10.0  # SoilGrids mapped unit is pH * 10

    if ph < 5.5:
        ph_status_code = "strongly_acidic"
        limitation_codes.append({"code": "low_ph", "params": {"ph": f"{ph:.1f}"}})
        recommendation_codes.append({"code": "ph_liming", "params": {}})
    elif 5.5 <= ph <= 6.5:
        ph_status_code = "slightly_acidic"
    elif 6.5 < ph <= 7.5:
        ph_status_code = "neutral"
    else:
        ph_status_code = "alkaline"
        limitation_codes.append({"code": "high_ph", "params": {"ph": f"{ph:.1f}"}})
        recommendation_codes.append({"code": "ph_acidic_fertilizer", "params": {}})

    # 3. Organic Carbon (SOC)
    # SoilGrids SOC is in dg/kg. 1 dg/kg = 0.1 g/kg = 0.01%
    soc_raw = soil_data.get("soc", 20)
    soc_percent = soc_raw / 100.0

    if soc_percent < 1.0:
        soc_status_code = "low"
        recommendation_codes.append({"code": "soc_critical", "params": {}})
    elif soc_percent > 3.0:
        soc_status_code = "high"
    else:
        soc_status_code = "medium"
        recommendation_codes.append({"code": "soc_maintain", "params": {}})

    def render(labels: Dict[str, str], items: List[Dict[str, Any]]) -> List[str]:
        return [labels[i["code"]].format(**i["params"]) for i in items]

    return {
        "texture_code": texture_code,
        "texture": TEXTURE_LABELS[texture_code],
        "ph": round(ph, 1),
        "ph_status_code": ph_status_code,
        "ph_status": PH_STATUS_LABELS[ph_status_code],
        "organic_carbon_percent": round(soc_percent, 2),
        "organic_carbon_status_code": soc_status_code,
        "organic_carbon_status": SOC_STATUS_LABELS[soc_status_code],
        "limitation_codes": limitation_codes,
        "recommendation_codes": recommendation_codes,
        "limitations": render(LIMITATION_LABELS, limitation_codes),
        "recommendations": render(RECOMMENDATION_LABELS, recommendation_codes),
        "raw_data": soil_data,
    }
