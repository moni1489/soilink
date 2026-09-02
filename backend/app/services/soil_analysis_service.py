from typing import Dict, List, Any

def get_texture_class(sand: float, silt: float, clay: float) -> str:
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
        return "Неизвестно"
        
    sand_pct = (sand_pct / total) * 100
    silt_pct = (silt_pct / total) * 100
    clay_pct = (clay_pct / total) * 100

    if clay_pct >= 40:
        if sand_pct <= 45 and silt_pct < 40: return "Глина (Clay)"
        if silt_pct >= 40: return "Тяжелый суглинок (Silty Clay)"
        return "Песчаная глина (Sandy Clay)"
    
    if clay_pct >= 27:
        if sand_pct >= 45: return "Песчано-глинистый суглинок (Sandy Clay Loam)"
        if silt_pct >= 50: return "Илисто-глинистый суглинок (Silty Clay Loam)"
        return "Глинистый суглинок (Clay Loam)"
        
    if silt_pct >= 80 and clay_pct < 12: return "Ил (Silt)"
    if silt_pct >= 50 and clay_pct < 27: return "Илистый суглинок (Silt Loam)"
    
    if sand_pct >= 85: return "Песок (Sand)"
    if sand_pct >= 70: return "Супесь (Loamy Sand)"
    if sand_pct >= 52 and clay_pct <= 20: return "Песчаный суглинок (Sandy Loam)"
    
    return "Суглинок (Loam)"

def analyze_soil(soil_data: Dict[str, float]) -> Dict[str, Any]:
    """
    Analyzes raw SoilGrids properties and generates actionable agronomic insights.
    """
    recommendations = []
    limitations = []
    
    # 1. Texture Analysis
    texture = get_texture_class(
        soil_data.get("sand_content", 0),
        soil_data.get("silt_content", 0),
        soil_data.get("clay_content", 0)
    )
    
    if "Глин" in texture:
        limitations.append("Высокая плотность почвы, возможны проблемы с дренажем.")
        recommendations.append("Рассмотрите глубокое рыхление. Избегайте обработки во влажном состоянии.")
    elif "Пес" in texture:
        limitations.append("Низкая влагоемкость, быстрое вымывание питательных веществ.")
        recommendations.append("Рекомендуется частое дробное орошение и внесение органических удобренов для удержания влаги.")
    else:
        recommendations.append("Оптимальный гранулометрический состав для большинства сельскохозяйственных культур.")
        
    # 2. pH Analysis
    ph_raw = soil_data.get("phh2o", 65)
    ph = ph_raw / 10.0  # SoilGrids mapped unit is pH * 10
    ph_status = "Нейтральная"
    
    if ph < 5.5:
        ph_status = "Сильнокислая"
        limitations.append(f"Пониженный pH ({ph:.1f}) блокирует усвоение фосфора.")
        recommendations.append("Требуется известкование (внесение доломитовой муки или мела) перед посадкой.")
    elif 5.5 <= ph <= 6.5:
        ph_status = "Слабокислая"
    elif 6.5 < ph <= 7.5:
        ph_status = "Нейтральная"
    else:
        ph_status = "Щелочная"
        limitations.append(f"Повышенный pH ({ph:.1f}) может привести к дефициту железа и цинка.")
        recommendations.append("Используйте физиологически кислые удобрения (например, сульфат аммония).")

    # 3. Organic Carbon (SOC)
    # SoilGrids SOC is in dg/kg. 1 dg/kg = 0.1 g/kg = 0.01%
    soc_raw = soil_data.get("soc", 20)
    soc_percent = soc_raw / 100.0
    
    soc_status = "Среднее"
    if soc_percent < 1.0:
        soc_status = "Низкое"
        recommendations.append("Критически низкий уровень гумуса. Обязательно внесение навоза, компоста или посев сидератов.")
    elif soc_percent > 3.0:
        soc_status = "Высокое"
    else:
        recommendations.append("Поддерживайте текущий уровень органики пожнивными остатками.")
        
    return {
        "texture": texture,
        "ph": round(ph, 1),
        "ph_status": ph_status,
        "organic_carbon_percent": round(soc_percent, 2),
        "organic_carbon_status": soc_status,
        "limitations": limitations,
        "recommendations": recommendations,
        "raw_data": soil_data
    }
