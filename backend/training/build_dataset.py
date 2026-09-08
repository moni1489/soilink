"""
Сборка единой обучающей таблицы из Supplement 2.xlsx.

Исходник — научный supplement (транссект по Казахстану, 40 точек, 2 сезона
опробования: май и сентябрь 2015). Каждый лист хранит один тип измерения
в широком формате (колонки MAY / SEP). Здесь всё сводится в long-format:
одна строка = одна точка в один сезон (40 x 2 = 80 наблюдений).

Запуск:
    backend/.venv/bin/python backend/training/build_dataset.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
SRC = HERE / "Supplement 2.xlsx"
OUT = HERE / "soil_dataset.csv"


def _sid(s: pd.Series) -> pd.Series:
    """Приводит идентификатор точки к int."""
    return pd.to_numeric(s, errors="coerce").astype("Int64")


def load_annotation() -> pd.DataFrame:
    ann = pd.read_excel(SRC, sheet_name="Annotation (9)")
    ann = ann.rename(columns={
        "Internal sample #": "sample_id",
        "Location": "location",
        "Site Description": "site_description",
        "Land Use /Cover": "land_use",
        "Elevation, meters (msl)": "elevation_m",
        "Biome ": "biome",
        "Environmental Feature": "env_feature",
        "Soil type": "soil_type_wrb",
        "Longtitude": "longitude",
        "Latitude ": "latitude",
        "Mean total precipitation, mm": "precip_mm",
        "Mean annual temperature, ºC": "mat_c",
    })
    ann["sample_id"] = _sid(ann["sample_id"])
    # В исходнике много хвостовых пробелов и разнобой в написании категорий
    for c in ["land_use", "biome", "env_feature", "soil_type_wrb", "location"]:
        ann[c] = ann[c].astype(str).str.strip().str.lower()
    # 'montane  temperate grassland' и 'montane temperate grassland' — один класс
    ann["biome"] = ann["biome"].str.replace(r"\s+", " ", regex=True)
    ann["env_feature"] = ann["env_feature"].str.replace(r"\s+", " ", regex=True)
    ann["soil_type_wrb"] = ann["soil_type_wrb"].str.replace(r"\s*\+\s*", "+", regex=True)
    return ann[[
        "sample_id", "location", "land_use", "elevation_m", "biome",
        "env_feature", "soil_type_wrb", "longitude", "latitude",
        "precip_mm", "mat_c",
    ]]


def load_carbon() -> pd.DataFrame:
    """TC / TOC / TIC, г/кг. Трёхуровневая шапка -> берём по позициям колонок."""
    raw = pd.read_excel(SRC, sheet_name="TC,TOC,TIC (1) ", header=None, skiprows=3)
    cols = {0: "sample_id", 1: "tc_may", 4: "toc_may", 7: "tic_may",
            10: "tc_sep", 13: "toc_sep", 16: "tic_sep"}
    df = raw[list(cols)].rename(columns=cols)
    df["sample_id"] = _sid(df["sample_id"])
    return df.dropna(subset=["sample_id"])


def load_loi() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name="LOI (2)").rename(columns={
        "Sample #": "sample_id", "LOI, %(MAY)": "loi_may", "LOI, % (SEP)": "loi_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "loi_may", "loi_sep"]]


def load_nitrogen() -> pd.DataFrame:
    """Общий азот, г/кг. Шапка занимает 2 строки (r0 — названия, r1 — единицы)."""
    df = pd.read_excel(SRC, sheet_name="Total Nitrogen (3)", skiprows=[1]).rename(columns={
        "TN": "sample_id", "Mean May": "tn_may", "Mean Sep": "tn_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "tn_may", "tn_sep"]]


def load_bulk_density() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name="Dry bulk Density (4)").rename(columns={
        "Sample #": "sample_id",
        "Dry bulk density, g/kg (MAY)": "bd_may",
        "Dry bulk density, g/kg, LOI(SEP)": "bd_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "bd_may", "bd_sep"]]


def load_moisture() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name="Soil Moisture  (5)")
    df.columns = ["sample_id", "dt_may", "sm_grav_may", "_s1", "sm_vol_may",
                  "dt_sep", "sm_grav_sep", "_s2", "sm_vol_sep"]
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "dt_may", "sm_grav_may", "sm_vol_may",
               "dt_sep", "sm_grav_sep", "sm_vol_sep"]]


def load_ph() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name="pH SU & SN (6)").rename(columns={
        "Sample #": "sample_id",
        "pH SN   (MAY)": "ph_sn_may", "pH SN   (SEP)": "ph_sn_sep",
        "pH SU   (MAY)": "ph_su_may", "pH SU   (SEP)": "ph_su_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "ph_sn_may", "ph_sn_sep", "ph_su_may", "ph_su_sep"]]


def load_ec() -> pd.DataFrame:
    df = pd.read_excel(SRC, sheet_name="EC SN (7)").rename(columns={
        "Sample #": "sample_id",
        "EC SN   (MAY), μS/cm": "ec_may", "EC SN   (SEP), μS/cm": "ec_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "ec_may", "ec_sep"]]


def load_stocks() -> pd.DataFrame:
    """Запасы TOC/TN, т/га — годовые, без разбивки по сезонам."""
    df = pd.read_excel(SRC, sheet_name="TOC and TN stocks (8)", skiprows=[1]).rename(columns={
        "Samples": "sample_id",
        "Total organic carbon": "toc_stock_t_ha",
        "Total nitrogen": "tn_stock_t_ha"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "toc_stock_t_ha", "tn_stock_t_ha"]]


# Измерения, у которых есть отдельные значения на май и сентябрь
SEASONAL = ["tc", "toc", "tic", "loi", "tn", "bd", "sm_grav", "sm_vol",
            "ph_sn", "ph_su", "ec"]


def load_site_climate() -> pd.DataFrame | None:
    """
    Климатические нормы ERA5 (1991-2020), выкачанные fetch_site_climate.py.

    Значения из самого Supplement 2 заданы поблочно и взяты из источника,
    недоступного приложению. Обучаться на них, а в проде подавать Open-Meteo —
    значит получить сдвиг домена на входе. Поэтому при наличии файла
    климатические признаки берутся из ERA5, а колонки из статьи сохраняются
    под суффиксом _paper для сравнения.
    """
    path = HERE / "site_climate.csv"
    if not path.exists():
        print("ВНИМАНИЕ: site_climate.csv не найден, климат берётся из статьи. "
              "Запустите fetch_site_climate.py, иначе обучающие признаки не "
              "совпадут с теми, что подаёт приложение.")
        return None
    df = pd.read_csv(path)
    if df["climate_is_fallback"].any():
        raise ValueError(
            "В site_climate.csv есть точки с климатом по умолчанию. "
            "Перезапустите fetch_site_climate.py.")
    return df


def build() -> pd.DataFrame:
    wide = load_annotation()
    for loader in (load_carbon, load_loi, load_nitrogen, load_bulk_density,
                   load_moisture, load_ph, load_ec, load_stocks):
        wide = wide.merge(loader(), on="sample_id", how="left")

    frames = []
    for season, suffix in (("may", "may"), ("sep", "sep")):
        part = wide[[c for c in wide.columns
                     if not c.endswith(("_may", "_sep"))]].copy()
        part["season"] = season
        for base in SEASONAL:
            # в исходнике встречается текст 'missing' вместо числа (EC, точка 8, сентябрь)
            part[base] = pd.to_numeric(wide[f"{base}_{suffix}"], errors="coerce")
        part["sampling_dt"] = pd.to_datetime(wide[f"dt_{suffix}"], errors="coerce")
        frames.append(part)

    df = pd.concat(frames, ignore_index=True)

    climate = load_site_climate()
    if climate is not None:
        df = df.merge(climate, on="sample_id", how="left")
        df = df.rename(columns={"precip_mm": "precip_mm_paper",
                                "mat_c": "mat_c_paper",
                                "elevation_m": "elevation_m_paper"})
        df["precip_mm"] = df["era5_precip_mm"]
        df["mat_c"] = df["era5_mat_c"]
        df["elevation_m"] = df["era5_elevation_m"]

    # Производные признаки
    df["doy"] = df["sampling_dt"].dt.dayofyear
    df["is_september"] = (df["season"] == "sep").astype(int)
    # C:N — классический индикатор скорости минерализации органики
    df["cn_ratio"] = df["toc"] / df["tn"].replace(0, np.nan)
    # TIC/TC — доля карбонатов, косвенный признак засолённых/щелочных почв
    df["carbonate_frac"] = df["tic"] / df["tc"].replace(0, np.nan)

    df = df.sort_values(["sample_id", "season"]).reset_index(drop=True)
    return df


if __name__ == "__main__":
    df = build()
    df.to_csv(OUT, index=False)
    print(f"Сохранено: {OUT}")
    print(f"Размер: {df.shape[0]} строк x {df.shape[1]} колонок "
          f"({df['sample_id'].nunique()} точек x 2 сезона)\n")
    key = ["toc", "tn", "sm_grav", "ph_sn", "ph_su", "ec", "bd", "loi",
           "tic", "cn_ratio", "elevation_m", "precip_mm", "mat_c"]
    print(df[key].describe().T.round(2).to_string())
    print("\nПропуски по ключевым колонкам:")
    miss = df[key].isna().sum()
    print(miss[miss > 0].to_string() if miss.any() else "  нет")
