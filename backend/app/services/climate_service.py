"""
Климатические нормы и высота точки — Open-Meteo.

Модели состояния почвы обучены на среднегодовой температуре, годовой сумме
осадков и высоте над уровнем моря. В БД этих величин нет: поле Field.rainfall
задаётся пользователем и по смыслу не является климатической нормой.
Здесь они считаются по координатам поля из архива Open-Meteo (реанализ ERA5)
за последние полные годы.

Ответы кешируются в памяти по округлённым координатам: климатическая норма
меняется медленно, а сетка ERA5 всё равно ~11 км, поэтому округление до
0.1 градуса не теряет точности, но убирает почти все повторные запросы.
"""

from typing import Optional

import httpx

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

# Стандартный период климатической нормы ВМО. Фиксирован намеренно:
# модель обучается на этих же значениях, поэтому train и inference обязаны
# брать климат из одного источника за один и тот же период.
NORM_START = "1991-01-01"
NORM_END = "2020-12-31"
NORM_YEARS = 30

_cache: dict[tuple[float, float], dict[str, float]] = {}

# Запасной вариант, если сеть недоступна: грубая широтная модель климата
# умеренного пояса Северного полушария. Не претендует на точность —
# нужна только чтобы инференс не падал.
_FALLBACK = {"precip_mm": 300.0, "mat_c": 5.0, "elevation_m": 300.0}


def _cache_key(lat: float, lon: float) -> tuple[float, float]:
    return (round(lat, 1), round(lon, 1))


def _fetch_elevation(lat: float, lon: float, timeout: float) -> Optional[float]:
    try:
        resp = httpx.get(ELEVATION_URL,
                         params={"latitude": lat, "longitude": lon},
                         timeout=timeout)
        resp.raise_for_status()
        values = resp.json().get("elevation") or []
        return float(values[0]) if values else None
    except Exception:
        return None


def _fetch_normals(lat: float, lon: float, timeout: float) -> Optional[dict[str, float]]:
    """Среднегодовая температура (°C) и годовая сумма осадков (мм)."""
    try:
        resp = httpx.get(ARCHIVE_URL, params={
            "latitude": lat,
            "longitude": lon,
            "start_date": NORM_START,
            "end_date": NORM_END,
            "daily": "temperature_2m_mean,precipitation_sum",
            "timezone": "UTC",
        }, timeout=timeout)
        resp.raise_for_status()
        daily = resp.json().get("daily", {})
        temps = [t for t in daily.get("temperature_2m_mean", []) if t is not None]
        precip = [p for p in daily.get("precipitation_sum", []) if p is not None]
        if not temps or not precip:
            return None
        return {
            "mat_c": sum(temps) / len(temps),
            # сумма осадков за все годы, делённая на число лет
            "precip_mm": sum(precip) / NORM_YEARS,
        }
    except Exception:
        return None


def get_climate(lat: Optional[float], lon: Optional[float],
                timeout: float = 45.0) -> dict[str, float]:
    """
    Возвращает {'precip_mm', 'mat_c', 'elevation_m', 'aridity'}.

    Без координат или при недоступности API возвращаются значения по умолчанию
    вместе с флагом 'is_fallback', чтобы вызывающий код мог снизить доверие
    к прогнозу.
    """
    if lat is None or lon is None:
        return {**_FALLBACK, "aridity": _aridity(_FALLBACK), "is_fallback": True}

    key = _cache_key(lat, lon)
    if key in _cache:
        return _cache[key].copy()

    normals = _fetch_normals(lat, lon, timeout)
    # запрос высоты лёгкий, ему длинный таймаут ни к чему
    elevation = _fetch_elevation(lat, lon, min(timeout, 8.0))

    if normals is None:
        result = {**_FALLBACK, "is_fallback": True}
        if elevation is not None:
            result["elevation_m"] = elevation
    else:
        result = {
            "precip_mm": normals["precip_mm"],
            "mat_c": normals["mat_c"],
            "elevation_m": elevation if elevation is not None
            else _FALLBACK["elevation_m"],
            "is_fallback": False,
        }

    result["aridity"] = _aridity(result)
    _cache[key] = result.copy()
    return result


def _aridity(d: dict[str, float]) -> float:
    """Индекс аридности Де Мартонна: P / (T + 10)."""
    return d["precip_mm"] / (d["mat_c"] + 10.0)


def clear_cache() -> None:
    _cache.clear()
