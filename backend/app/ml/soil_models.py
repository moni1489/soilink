"""
Инференс моделей состояния почвы, обученных на датасете Supplement 2
(транссект по Казахстану, 40 точек, 2015).

Модели:
    soil_state_model.pkl     — класс состояния почвы (4 класса)
    soil_nitrogen_model.pkl  — общий азот, г/кг
    soil_carbon_model.pkl    — органический углерод, г/кг
    soil_moisture_model.pkl  — гравиметрическая влажность, %
    soil_ph_model.pkl        — кислотность pH (солевая вытяжка)

Каждой паре model/meta соответствует свой список признаков — он лежит
в meta["features"], поэтому код здесь не привязан к конкретному набору:
строится словарь всех возможных признаков, из него берётся нужный срез.

Отдельно проверяется область применимости (applicability domain). Модели
обучены на 40 точках одного транссекта в Казахстане; за его пределами
географические признаки экстраполируются, и прогноз недостоверен.
Вместо тихой выдачи неправильного ответа возвращается пометка о том,
что точка вне области обучения.
"""

import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

from app.core.config import settings

# Границы обучающей выборки: транссект Петропавловск - Тараз
TRAIN_BBOX = {"lat_min": 42.9, "lat_max": 54.9, "lon_min": 69.1, "lon_max": 75.0}
# Допуск, в градусах, на который точка может выйти за bbox без потери доверия
BBOX_MARGIN = 2.0

_MODELS: dict[str, tuple] = {}
_LOADED = False

_SPECS = {
    "state": ("soil_state_model.pkl", "soil_state_meta.pkl"),
    "nitrogen": ("soil_nitrogen_model.pkl", "soil_nitrogen_meta.pkl"),
    "carbon": ("soil_carbon_model.pkl", "soil_carbon_meta.pkl"),
    "moisture": ("soil_moisture_model.pkl", "soil_moisture_meta.pkl"),
    "ph": ("soil_ph_model.pkl", "soil_ph_meta.pkl"),
}


def load_models() -> None:
    global _LOADED
    if _LOADED:
        return
    models_dir: Path = settings.models_path
    for name, (model_file, meta_file) in _SPECS.items():
        mp, tp = models_dir / model_file, models_dir / meta_file
        if mp.exists() and tp.exists():
            _MODELS[name] = (joblib.load(mp), joblib.load(tp))
    _LOADED = True


def reset_cache() -> None:
    """Сброс кеша моделей — нужен после переобучения без перезапуска процесса."""
    global _LOADED
    _MODELS.clear()
    _LOADED = False


# --- Перевод данных приложения в признаки обучающего датасета -------------
def _soil_group_from_soilgrid(soilgrid: dict, ph: float) -> str:
    """
    Группа почв WRB по данным SoilGrids.

    В приложении тип почвы задаётся гранулометрией (Sandy/Loamy/Clayey/...),
    а модель обучена на реферативных группах WRB. Прямого соответствия между
    ними нет, поэтому группа определяется по измеримым свойствам:
    песчаности, содержанию органического углерода и реакции среды.
    Это эвристика-мост, а не классификация WRB по всем правилам.
    """
    sand = soilgrid.get("sand_content", 420)          # г/кг
    soc = soilgrid.get("soc", 25) / 10.0              # дг/кг -> г/кг

    if sand > 700:
        return "arenosol"
    if ph > 8.5:
        return "saline"
    if soc >= 30:
        return "chernozem"
    if soc >= 15:
        return "kastanozem"
    return "other"


def _land_use_from_field(crop_type: Optional[str]) -> str:
    """У приложения нет класса землепользования — выводим из наличия культуры."""
    return "crop cover" if crop_type else "grass cover"


def build_features(
    ph: float,
    electrical_conductivity: float,   # дСм/м, как в показаниях датчика
    soil_moisture: float,             # %
    soilgrid: dict,
    climate: dict,
    latitude: Optional[float],
    longitude: Optional[float],
    crop_type: Optional[str] = None,
    when: Optional[datetime] = None,
) -> dict:
    """Полный словарь признаков в том виде, в каком их видели модели."""
    when = when or datetime.now(timezone.utc)

    # EC в датасете хранится в мкСм/см и логарифмируется: разброс от 60
    # до 9000 мкСм/см, без лога одна солончаковая точка перетягивает шкалу.
    ec_us_cm = max(electrical_conductivity * 1000.0, 1.0)

    # SoilGrids отдаёт плотность в сг/см3, модель обучена на г/см3
    bd = soilgrid.get("bdod", 135) / 100.0

    soil_group = _soil_group_from_soilgrid(soilgrid, ph)
    land_use = _land_use_from_field(crop_type)

    features = {
        "ph_sn": ph,
        "ec_log": math.log10(ec_us_cm),
        "sm_grav": soil_moisture,
        "bd": bd,
        "precip_mm": climate["precip_mm"],
        "mat_c": climate["mat_c"],
        "aridity": climate["aridity"],
        "elevation_m": climate["elevation_m"],
        "latitude": latitude if latitude is not None else 48.0,
        "longitude": longitude if longitude is not None else 72.0,
        "is_september": 1 if when.month >= 7 else 0,
        "doy": when.timetuple().tm_yday,
        "has_solonetz": 1 if soil_group == "saline" else 0,
    }
    for value in ["barren land", "crop cover", "grass cover",
                  "shrub cover", "tree cover"]:
        features[f"land_use_{value}"] = 1.0 if land_use == value else 0.0
    for value in ["arenosol", "chernozem", "kastanozem", "other", "saline"]:
        features[f"soil_group_{value}"] = 1.0 if soil_group == value else 0.0

    return features


def in_training_domain(latitude: Optional[float],
                       longitude: Optional[float]) -> bool:
    """Попадает ли точка в область, на которой обучались модели."""
    if latitude is None or longitude is None:
        return False
    return (TRAIN_BBOX["lat_min"] - BBOX_MARGIN <= latitude
            <= TRAIN_BBOX["lat_max"] + BBOX_MARGIN
            and TRAIN_BBOX["lon_min"] - BBOX_MARGIN <= longitude
            <= TRAIN_BBOX["lon_max"] + BBOX_MARGIN)


def _row(features: dict, meta: dict) -> pd.DataFrame:
    """Срез признаков строго в том порядке, в каком обучалась модель."""
    missing = [f for f in meta["features"] if f not in features]
    if missing:
        raise KeyError(f"Не хватает признаков для модели: {missing}")
    return pd.DataFrame([{f: features[f] for f in meta["features"]}])[meta["features"]]


# --- Публичные предсказания ----------------------------------------------
def predict_soil_state(features: dict) -> Optional[dict]:
    """
    Класс состояния почвы.

    Возвращает {'state', 'confidence', 'probabilities'} либо None,
    если модель не загружена.
    """
    load_models()
    if "state" not in _MODELS:
        return None
    model, meta = _MODELS["state"]
    row = _row(features, meta)
    proba = model.predict_proba(row)[0]
    idx = int(proba.argmax())
    classes = meta["classes"]
    return {
        "state": classes[idx],
        "confidence": float(proba[idx]),
        "probabilities": {c: float(p) for c, p in zip(classes, proba)},
    }


def _predict_regression(name: str, features: dict) -> Optional[float]:
    load_models()
    if name not in _MODELS:
        return None
    model, meta = _MODELS[name]
    return float(model.predict(_row(features, meta))[0])


def predict_nitrogen(features: dict) -> Optional[float]:
    """Общий азот, г/кг."""
    return _predict_regression("nitrogen", features)


def predict_carbon(features: dict) -> Optional[float]:
    """Органический углерод, г/кг."""
    return _predict_regression("carbon", features)


def predict_moisture(features: dict) -> Optional[float]:
    """Гравиметрическая влажность, % — оценка при отказе датчика влаги."""
    return _predict_regression("moisture", features)


def predict_ph(features: dict) -> Optional[float]:
    """
    Кислотность — оценка при отказе pH-электрода.

    Обучена без признака ph_sn, поэтому её можно считать независимой
    проверкой показаний датчика: сильное расхождение с измеренным pH —
    повод заподозрить дрейф или поломку электрода.
    """
    return _predict_regression("ph", features)


def model_info() -> dict:
    """Что реально загружено — для диагностики и эндпоинта состояния сервиса."""
    load_models()
    return {
        name: {
            "algorithm": meta.get("algorithm"),
            "n_features": len(meta.get("features", [])),
            "metrics_loso": meta.get("metrics_loso"),
            "target": meta.get("target"),
            "n_train": meta.get("n_train"),
        }
        for name, (_, meta) in _MODELS.items()
    }
