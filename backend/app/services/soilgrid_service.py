"""
SoilGrids REST API client (ISRIC SoilGrids v2.0)

Fetches physical soil composition properties for a coordinate:
    clay_content  – clay content (g/kg)
    sand_content  – sand content (g/kg)
    silt_content  – silt content (g/kg)
    soc           – soil organic carbon (g/kg)
    cec           – cation exchange capacity (mmol(c)/kg)
    bdod          – bulk density (cg/cm³)

All values are at the 0–5 cm depth layer (mean).

If no coordinates are available, soil-type-specific defaults are returned
so downstream inference always receives valid feature values.
"""

import httpx
from typing import Optional

SOILGRIDS_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"

PROPERTIES = ["clay", "sand", "silt", "soc", "cec", "bdod"]

# Fallback defaults per soil type (units match SoilGrids mapped units)
_DEFAULTS_BY_SOIL_TYPE: dict[str, dict[str, float]] = {
    "Sandy":  {"clay_content": 100, "sand_content": 800, "silt_content": 100, "soc": 8,  "cec": 80,  "bdod": 155},
    "Loamy":  {"clay_content": 220, "sand_content": 420, "silt_content": 360, "soc": 25, "cec": 180, "bdod": 135},
    "Clayey": {"clay_content": 550, "sand_content": 150, "silt_content": 300, "soc": 35, "cec": 350, "bdod": 115},
    "Black":  {"clay_content": 600, "sand_content": 120, "silt_content": 280, "soc": 50, "cec": 420, "bdod": 105},
    "Red":    {"clay_content": 300, "sand_content": 400, "silt_content": 300, "soc": 15, "cec": 130, "bdod": 140},
}
_DEFAULT_FALLBACK = {"clay_content": 220, "sand_content": 420, "silt_content": 360,
                     "soc": 25, "cec": 180, "bdod": 135}


def _extract_mean(layers: list, prop_name: str) -> Optional[float]:
    """Pull the 0-5cm mean from the SoilGrids layers list."""
    for layer in layers:
        if layer.get("name") == prop_name:
            for depth in layer.get("depths", []):
                if depth.get("label") == "0-5cm":
                    return depth.get("values", {}).get("mean")
    return None


def fetch_soilgrid_properties(
    lat: float,
    lon: float,
    soil_type: str = "Loamy",
    timeout: float = 8.0,
) -> dict[str, float]:
    """
    Fetch SoilGrids properties synchronously for (lat, lon).

    Returns a dict with keys:
        clay_content, sand_content, silt_content, soc, cec, bdod

    Falls back to soil-type defaults on any error.
    """
    params = [("lon", lon), ("lat", lat), ("depth", "0-5cm"), ("value", "mean")]
    for prop in PROPERTIES:
        params.append(("property", prop))

    try:
        resp = httpx.get(SOILGRIDS_URL, params=params, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        layers = data.get("properties", {}).get("layers", [])

        result = {
            "clay_content": _extract_mean(layers, "clay"),
            "sand_content": _extract_mean(layers, "sand"),
            "silt_content": _extract_mean(layers, "silt"),
            "soc":          _extract_mean(layers, "soc"),
            "cec":          _extract_mean(layers, "cec"),
            "bdod":         _extract_mean(layers, "bdod"),
        }

        # Replace any None values with soil-type defaults
        defaults = _DEFAULTS_BY_SOIL_TYPE.get(soil_type, _DEFAULT_FALLBACK)
        for key in result:
            if result[key] is None:
                result[key] = defaults[key]

        return result

    except Exception:
        return _DEFAULTS_BY_SOIL_TYPE.get(soil_type, _DEFAULT_FALLBACK).copy()


def get_soilgrid_properties(
    lat: Optional[float],
    lon: Optional[float],
    soil_type: str = "Loamy",
) -> dict[str, float]:
    """
    Returns SoilGrids properties for a field.
    Uses live API when coordinates are available, defaults otherwise.
    """
    if lat is not None and lon is not None:
        return fetch_soilgrid_properties(lat, lon, soil_type)
    return _DEFAULTS_BY_SOIL_TYPE.get(soil_type, _DEFAULT_FALLBACK).copy()


def get_soilgrid_defaults(soil_type: str = "Loamy") -> dict[str, float]:
    """
    Returns soil-type-specific defaults without any API call.
    Used at inference time — SoilGrids API is only used during model training.
    """
    return _DEFAULTS_BY_SOIL_TYPE.get(soil_type, _DEFAULT_FALLBACK).copy()
