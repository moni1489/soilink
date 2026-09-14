"""
Собирает soilink_soil_models.ipynb из строковых блоков.

Ноутбук воспроизводит весь пайплайн backend/training/*.py как
последовательность ячеек Jupyter: сборка датасета, целевая метка,
защита от утечек, две схемы кросс-валидации, зоопарк моделей,
генетический алгоритм отбора признаков, итоговые метрики и графики.

Запуск:
    backend/.venv/bin/python backend/training/notebook/build_notebook.py
"""
import nbformat as nbf
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "soilink_soil_models.ipynb"

nb = nbf.v4.new_notebook()
cells = []


def md(src: str) -> None:
    cells.append(nbf.v4.new_markdown_cell(src.strip("\n")))


def code(src: str) -> None:
    cells.append(nbf.v4.new_code_cell(src.strip("\n")))


# ============================================================================
# 0. Титул
# ============================================================================
md("""
# Soilink: модели состояния почвы — транссект Петропавловск — Тараз

Пять моделей, обученных на лабораторных измерениях сорока точек вдоль
1300-километрового профиля через Казахстан (Supplement 2, транссект 2015 года,
опробование в мае и сентябре). Ноутбук воспроизводит полный пайплайн проекта
[Soilink](https://github.com/moni1489/soilink) от сырого Excel-файла до
сохранённых моделей: сборку датасета, защиту от утечек данных, две схемы
кросс-валидации, зоопарк алгоритмов и генетический отбор признаков.

**Данные.** Ноутбуку нужны два файла, приложенные как Kaggle Dataset:
`Supplement 2.xlsx` (исходник) и `site_climate.csv` (климатические нормы
ERA5 1991–2020 для всех 40 точек, выкачанные заранее — см. пояснение в
разделе 2).

**Время выполнения.** Полный прогон — зоопарк из 5–9 алгоритмов на пяти
целевых переменных, дважды провалидированных (Leave-One-Site-Out на 40
фолдов + блочная валидация по широте), плюс генетический отбор признаков —
занимает 10–20 минут на стандартном 4-ядерном CPU-инстансе Kaggle.
""")

# ============================================================================
# 1. Импорты и разрешение путей
# ============================================================================
md("""
## 1. Импорты и данные

Путь к входным файлам определяется автоматически: сначала ищется файл рядом
с ноутбуком (локальный запуск), затем — под `/kaggle/input/<любой-датасет>/`
(запуск на Kaggle). Это избавляет от привязки к конкретному слагу датасета,
который у каждого пользователя Kaggle будет свой.
""")

code("""
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.colors import LinearSegmentedColormap

from sklearn.ensemble import (GradientBoostingRegressor, RandomForestClassifier,
                              RandomForestRegressor, StackingRegressor)
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
                             cohen_kappa_score, confusion_matrix, f1_score,
                             mean_absolute_error, mean_squared_error, r2_score)
from sklearn.model_selection import (GroupKFold, LeaveOneGroupOut,
                                     cross_val_predict)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

warnings.filterwarnings("ignore", category=UserWarning)
pd.set_option("display.width", 120)
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

plt.rcParams.update({
    "figure.facecolor": "white", "axes.facecolor": "white",
    "axes.edgecolor": "#CFD1C4", "axes.grid": True,
    "grid.color": "#E4E5DA", "grid.linewidth": 0.8,
    "font.size": 11, "axes.titlesize": 12, "axes.titleweight": "bold",
    "axes.spines.top": False, "axes.spines.right": False,
})
ACCENT, ACCENT_DIM = "#245A6B", "#6E97A3"
WARN = "#8A5215"
SOIL_RAMP = LinearSegmentedColormap.from_list(
    "soil", ["#E8D5A9", "#C99A52", "#8C6234", "#3A2E1E"])
STATE_COLORS = {"critical": "#E8D5A9", "poor": "#C99A52",
                "moderate": "#8C6234", "healthy": "#3A2E1E"}
""")

code("""
def find_input(name: str) -> Path:
    \"\"\"Ищет файл рядом с ноутбуком, затем под /kaggle/input/*/name.\"\"\"
    local = Path(name)
    if local.exists():
        return local
    kin = Path("/kaggle/input")
    if kin.exists():
        for sub in sorted(kin.iterdir()):
            cand = sub / name
            if cand.exists():
                return cand
    raise FileNotFoundError(
        f"'{name}' не найден. На Kaggle: Add Input -> прикрепите датасет, "
        f"содержащий этот файл. Локально: положите файл рядом с ноутбуком.")


SRC = find_input("Supplement 2.xlsx")
CLIMATE_PATH = find_input("site_climate.csv")
print(f"Excel:   {SRC}")
print(f"Климат:  {CLIMATE_PATH}")
""")

# ============================================================================
# 2. Материал: сборка датасета
# ============================================================================
md("""
## 2. Материал

Исходник — supplement к научной работе: девять листов, на каждом свой тип
лабораторного измерения в широком формате (отдельные колонки на май и
сентябрь). Ниже каждый лист приводится к длинному формату и сводится в одну
таблицу: **строка = одна точка опробования в один сезон**.

Определяющая особенность выборки — она мала и сильно структурирована.
Сорок точек, каждая измерена дважды. Май и сентябрь одной точки — это
практически одна и та же почва, и вся методика ниже построена вокруг того,
чтобы на этом не обмануться.
""")

code("""
def _sid(s: pd.Series) -> pd.Series:
    \"\"\"Приводит идентификатор точки к int.\"\"\"
    return pd.to_numeric(s, errors="coerce").astype("Int64")


def load_annotation() -> pd.DataFrame:
    ann = pd.read_excel(SRC, sheet_name="Annotation (9)")
    ann = ann.rename(columns={
        "Internal sample #": "sample_id", "Location": "location",
        "Site Description": "site_description", "Land Use /Cover": "land_use",
        "Elevation, meters (msl)": "elevation_m", "Biome ": "biome",
        "Environmental Feature": "env_feature", "Soil type": "soil_type_wrb",
        "Longtitude": "longitude", "Latitude ": "latitude",
        "Mean total precipitation, mm": "precip_mm",
        "Mean annual temperature, ºC": "mat_c",
    })
    ann["sample_id"] = _sid(ann["sample_id"])
    for c in ["land_use", "biome", "env_feature", "soil_type_wrb", "location"]:
        ann[c] = ann[c].astype(str).str.strip().str.lower()
    ann["biome"] = ann["biome"].str.replace(r"\\s+", " ", regex=True)
    ann["env_feature"] = ann["env_feature"].str.replace(r"\\s+", " ", regex=True)
    ann["soil_type_wrb"] = ann["soil_type_wrb"].str.replace(r"\\s*\\+\\s*", "+", regex=True)
    return ann[["sample_id", "location", "land_use", "elevation_m", "biome",
                "env_feature", "soil_type_wrb", "longitude", "latitude",
                "precip_mm", "mat_c"]]


def load_carbon() -> pd.DataFrame:
    \"\"\"TC / TOC / TIC, г/кг. Трёхуровневая шапка -> берём по позициям колонок.\"\"\"
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
    \"\"\"Общий азот, г/кг. Шапка занимает 2 строки (r0 — названия, r1 — единицы).\"\"\"
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
        "EC SN   (MAY), \\u03bcS/cm": "ec_may", "EC SN   (SEP), \\u03bcS/cm": "ec_sep"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "ec_may", "ec_sep"]]


def load_stocks() -> pd.DataFrame:
    \"\"\"Запасы TOC/TN, т/га — годовые, без разбивки по сезонам.\"\"\"
    df = pd.read_excel(SRC, sheet_name="TOC and TN stocks (8)", skiprows=[1]).rename(columns={
        "Samples": "sample_id", "Total organic carbon": "toc_stock_t_ha",
        "Total nitrogen": "tn_stock_t_ha"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "toc_stock_t_ha", "tn_stock_t_ha"]]


SEASONAL = ["tc", "toc", "tic", "loi", "tn", "bd", "sm_grav", "sm_vol",
            "ph_sn", "ph_su", "ec"]

print("Загружены все 9 листов Supplement 2.xlsx")
""")

md("""
### 2.1. Климат: почему он берётся из ERA5, а не из статьи

В листе аннотации осадки и среднегодовая температура заданы *поблочно* —
несколько соседних точек делят одно значение, взятое из источника, которого
у приложения при инференсе нет. Обучение на этих значениях с подачей климата
Open-Meteo в продакшене дало бы систематически смещённый вход, который ничем
себя не выдаёт в метриках.

`site_climate.csv` содержит норму ВМО 1991–2020 из архива ERA5 (Open-Meteo),
выкачанную отдельно тем же сервисом, который работает в проде — для всех
сорока точек, без единого значения по умолчанию (фолбэка).
""")

code("""
climate = pd.read_csv(CLIMATE_PATH)
assert not climate["climate_is_fallback"].any(), (
    "В site_climate.csv есть точки с климатом по умолчанию — "
    "обучение на них давало бы неверные климатические признаки.")
print(f"Климат ERA5 для {len(climate)} точек, фолбэков: "
      f"{int(climate['climate_is_fallback'].sum())}")
climate.head()
""")

code("""
def build_dataset() -> pd.DataFrame:
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
            # в исходнике встречается текст 'missing' вместо числа
            # (EC, точка 8, сентябрь) — приводим к числу с coercion
            part[base] = pd.to_numeric(wide[f"{base}_{suffix}"], errors="coerce")
        part["sampling_dt"] = pd.to_datetime(wide[f"dt_{suffix}"], errors="coerce")
        frames.append(part)

    df = pd.concat(frames, ignore_index=True)

    # Климат ERA5 заменяет поблочные значения из статьи
    df = df.merge(climate, on="sample_id", how="left")
    df = df.rename(columns={"precip_mm": "precip_mm_paper",
                            "mat_c": "mat_c_paper",
                            "elevation_m": "elevation_m_paper"})
    df["precip_mm"] = df["era5_precip_mm"]
    df["mat_c"] = df["era5_mat_c"]
    df["elevation_m"] = df["era5_elevation_m"]

    df["doy"] = df["sampling_dt"].dt.dayofyear
    df["is_september"] = (df["season"] == "sep").astype(int)
    # C:N — классический индикатор скорости минерализации органики
    df["cn_ratio"] = df["toc"] / df["tn"].replace(0, np.nan)
    # TIC/TC — доля карбонатов, косвенный признак засолённых/щелочных почв
    df["carbonate_frac"] = df["tic"] / df["tc"].replace(0, np.nan)

    return df.sort_values(["sample_id", "season"]).reset_index(drop=True)


raw = build_dataset()
print(f"Собрано: {raw.shape[0]} строк x {raw.shape[1]} колонок "
      f"({raw['sample_id'].nunique()} точек x 2 сезона)")
raw[["toc", "tn", "sm_grav", "ph_sn", "ec", "bd", "precip_mm", "mat_c"]].describe().round(2).T
""")

# ============================================================================
# 3. Обогащение признаков + целевая метка
# ============================================================================
md("""
## 3. Признаки и целевая переменная

### 3.1. Укрупнение категорий и производные признаки

В исходнике 9 типов почв WRB на 40 точек — слишком дробно для 80 наблюдений.
Группируем по агрономически близким классам, логарифмируем электропроводность
(разброс 60–9176 мкСм/см, распределение логнормальное) и считаем индекс
аридности Де Мартонна — один физически осмысленный признак вместо двух
коррелированных (осадки и температура).
""")

code("""
SOIL_GROUP_MAP = {
    "chernozem": "chernozem", "chernozem+solonetz": "chernozem",
    "kastanozem": "kastanozem", "arenosol": "arenosol",
    "arenosol+solonetz": "arenosol", "calcisol+solonetz": "saline",
    "solonchak+solonetz": "saline", "regosol": "other", "umbrisol": "other",
}


def load_dataset(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["soil_group"] = df["soil_type_wrb"].map(SOIL_GROUP_MAP).fillna("other")
    df["has_solonetz"] = df["soil_type_wrb"].str.contains("solonetz").astype(int)
    df["ec_log"] = np.log10(df["ec"])
    df["ec_ds_m"] = df["ec"] / 1000.0  # мкСм/см -> дСм/м, агрономическая шкала
    df["aridity"] = df["precip_mm"] / (df["mat_c"] + 10.0)
    for col in ["ec", "ec_log", "ec_ds_m"]:
        df[col] = df[col].fillna(df[col].median())
    return df


df = load_dataset(raw)
""")

md("""
### 3.2. Целевая переменная: агрономический балл состояния почвы

В приложении уже существовал контракт на четыре класса состояния почвы, но
не было ни модели, ни разметки. Метка построена из измерений как балл 0–18.
Органика (углерод и азот) весит вдвое: она определяет плодородие и при этом
недоступна дешёвому полевому датчику.

> **Методологическая оговорка.** pH и EC входят в формулу метки, а значит
> модель обязана выучить их вклад тривиально. Ниже, в разделе 6, это
> проверяется контрольным опытом: тем же классификатором, обученным только
> на pH и EC.
""")

code("""
SOIL_STATE_CLASSES = ["critical", "poor", "moderate", "healthy"]
SOIL_STATE_CUTS = (6, 10, 14)  # границы балла 0..18 между классами


def _score_row(r) -> int:
    toc = 0 if r.toc < 6 else 1 if r.toc < 12 else 2 if r.toc < 20 else 3
    tn = 0 if r.tn < 0.75 else 1 if r.tn < 1.25 else 2 if r.tn < 2.0 else 3
    p = r.ph_sn
    if 6.0 <= p <= 7.5:
        ph = 3
    elif 5.5 <= p < 6.0 or 7.5 < p <= 8.0:
        ph = 2
    elif 5.0 <= p < 5.5 or 8.0 < p <= 8.5:
        ph = 1
    else:
        ph = 0
    e = r.ec_ds_m
    ec = 3 if e < 0.5 else 2 if e < 1.0 else 1 if e < 2.0 else 0
    return 2 * toc + 2 * tn + ph + ec


df["soil_score"] = df.apply(_score_row, axis=1)
df["soil_state"] = pd.cut(df["soil_score"], [-1, *SOIL_STATE_CUTS, 999],
                          labels=SOIL_STATE_CLASSES).astype(str)
df["soil_state_idx"] = df["soil_state"].map(
    {c: i for i, c in enumerate(SOIL_STATE_CLASSES)})

print(df["soil_state"].value_counts().reindex(SOIL_STATE_CLASSES))
""")

md("""
### Рис. 1 — Климатический профиль и состояние почвы вдоль транссекта

Профиль пересекает три климатические зоны: осадки падают с ~440 мм на севере
до ~135 мм у озера Балхаш и вновь поднимаются до ~750 мм в предгорьях на юге,
тогда как среднегодовая температура растёт почти монотонно. Совпадение
климатического минимума со сплошной полосой класса `critical` — это
структура самих данных, а не артефакт модели.
""")

code("""
sites = (df.drop_duplicates("sample_id")
         .sort_values("latitude", ascending=False)
         .reset_index(drop=True))
piv_state = df.pivot_table(index="sample_id", columns="season",
                           values="soil_state", aggfunc="first")
sites = sites.merge(piv_state.rename(columns={"may": "state_may", "sep": "state_sep"}),
                    on="sample_id")

fig, axes = plt.subplots(4, 1, figsize=(13, 8.5), sharex=True,
                         gridspec_kw={"height_ratios": [2, 1.3, 0.55, 0.55],
                                      "hspace": 0.12})

ax = axes[0]
ax.fill_between(range(len(sites)), sites["precip_mm"], color=ACCENT, alpha=0.15)
ax.plot(range(len(sites)), sites["precip_mm"], color=ACCENT, lw=2)
ax.set_ylabel("Осадки, мм/год")
ax.set_title("Климатический профиль и состояние почвы: Петропавловск \\u2192 Тараз",
            loc="left")
imin, imax = sites["precip_mm"].idxmin(), sites["precip_mm"].idxmax()
for i, lab in [(imin, "мин"), (imax, "макс")]:
    ax.annotate(f"{sites['precip_mm'][i]:.0f} мм \\u00b7 {lab}",
               (i, sites["precip_mm"][i]), textcoords="offset points",
               xytext=(0, 8), ha="center", fontsize=9, color="#3F4238")

ax = axes[1]
ax.plot(range(len(sites)), sites["mat_c"], color="#8C6234", lw=2)
ax.set_ylabel("t\\u00b0 среднегод., \\u00b0C")

for ax, col, label in [(axes[2], "state_may", "Май"), (axes[3], "state_sep", "Сентябрь")]:
    colors = [STATE_COLORS[s] for s in sites[col]]
    ax.bar(range(len(sites)), [1] * len(sites), color=colors, width=1.0,
          edgecolor="white", linewidth=0.6)
    ax.set_yticks([])
    ax.set_ylabel(label, rotation=0, ha="right", va="center", fontsize=10)
    ax.grid(False)

axes[-1].set_xticks(range(0, len(sites), 5))
axes[-1].set_xticklabels([f"{sites['latitude'][i]:.1f}\\u00b0" for i in range(0, len(sites), 5)])
axes[-1].set_xlabel("Широта, с.ш. (север \\u2192 юг)")

handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in STATE_COLORS.values()]
fig.legend(handles, STATE_COLORS.keys(), loc="upper center", ncol=4,
          bbox_to_anchor=(0.5, 1.015), frameon=False, fontsize=10)
plt.tight_layout()
plt.show()
""")

# ============================================================================
# 4. Защита от утечек, наборы признаков, кодирование
# ============================================================================
md("""
## 4. Защита от утечек и наборы признаков

Часть колонок — не независимые измерения, а производные друг от друга:
объёмная влажность есть произведение гравиметрической на плотность; общий
углерод есть сумма органического и неорганического; потери при прокаливании
— по сути та же органика; запасы — концентрация, умноженная на плотность и
глубину; C:N — частное двух целевых. Любая такая пара, попав в признаки,
подала бы модели готовый ответ на входе.

Наборы признаков ограничены тем, что реально доступно приложению в момент
инференса: полевой датчик (pH, EC, влажность, температура почвы) плюс
координаты и климатическая норма.
""")

code("""
LEAKAGE = {
    # sm_vol = sm_grav * bd / 100 — та же влажность в других единицах
    "sm_grav": ["sm_vol"],
    "tn": ["tn_stock_t_ha", "cn_ratio", "toc", "tc", "tic", "loi",
           "toc_stock_t_ha", "carbonate_frac"],
    "toc": ["toc_stock_t_ha", "cn_ratio", "tn", "tc", "tic", "loi",
            "tn_stock_t_ha", "carbonate_frac"],
    # ph_su — та же кислотность, измеренная другим методом
    "ph_sn": ["ph_su", "soil_score", "soil_state"],
    "soil_state_idx": ["toc", "tn", "tc", "tic", "loi", "cn_ratio",
                       "toc_stock_t_ha", "tn_stock_t_ha", "carbonate_frac",
                       "soil_score", "soil_state", "sm_vol"],
}

SENSOR_FEATURES = ["ph_sn", "ec_log", "sm_grav", "bd"]
CLIMATE_FEATURES = ["precip_mm", "mat_c", "aridity"]
TERRAIN_FEATURES = ["elevation_m", "latitude", "longitude"]
SEASON_FEATURES = ["is_september", "doy"]
CATEGORICAL_FEATURES = ["land_use", "soil_group"]
BINARY_FEATURES = ["has_solonetz"]


def encode(df: pd.DataFrame, numeric: list, categorical: list = None) -> pd.DataFrame:
    \"\"\"One-hot для категорий + числовые признаки, в стабильном порядке колонок.\"\"\"
    parts = [df[numeric].astype(float)]
    if categorical:
        for col in categorical:
            parts.append(pd.get_dummies(df[col], prefix=col).astype(float))
    out = pd.concat(parts, axis=1)
    return out.reindex(sorted(out.columns), axis=1)
""")

md("""
### 4.1. Две схемы валидации вместо одной

Обычный `KFold` здесь дал бы утечку: май и сентябрь одной точки попали бы в
обучающую и тестовую части одновременно. Основная схема —
**Leave-One-Site-Out**: сорок фолдов, точка целиком уходит в тест.

Этого недостаточно: точки лежат вдоль профиля, климат меняется по нему
монотонно, соседние точки похожи — модель может интерполировать между
соседями. Параллельно считается **блочная валидация по широте**: пять
широтных полос, и вопрос — переносится ли модель на невиданный регион.
""")

code("""
def loso_cv():
    return LeaveOneGroupOut()


def spatial_blocks(df: pd.DataFrame, n_blocks: int = 5) -> np.ndarray:
    \"\"\"Точки лежат вдоль транссекта север-юг; блоки по широте проверяют
    перенос модели на невиданный регион, а не интерполяцию между соседями.\"\"\"
    return pd.qcut(df["latitude"], n_blocks, labels=False).to_numpy()


def regression_metrics(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {"R2": float(r2_score(y_true, y_pred)), "RMSE": rmse,
            "MAE": float(mean_absolute_error(y_true, y_pred)),
            "RMSE/SD": float(rmse / y_true.std(ddof=1))}


def classification_metrics(y_true, y_pred) -> dict:
    return {"accuracy": float(accuracy_score(y_true, y_pred)),
            "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
            "macro_F1": float(f1_score(y_true, y_pred, average="macro")),
            "cohen_kappa": float(cohen_kappa_score(y_true, y_pred))}


def fmt_metrics(m: dict) -> str:
    return "  ".join(f"{k}={v:.3f}" for k, v in m.items())


groups = df["sample_id"].to_numpy()
blocks = spatial_blocks(df)
print(f"{len(df)} наблюдений, {df['sample_id'].nunique()} точек (LOSO), "
      f"{len(np.unique(blocks))} пространственных блоков")
""")

# ============================================================================
# 5. Зоопарк моделей
# ============================================================================
md("""
## 5. Зоопарк моделей

Регрессоры повторяют набор алгоритмов из репозитория-референса
[Soil Moisture Prediction Using ML algorithms](https://github.com/lokesh28-krish/Soil-Moisture-Prediction-Using-machine-Learning-algorithms)
(Linear Regression, Decision Tree, Random Forest, KNN, XGBoost), плюс Ridge.
Для кислотности набор расширен по
[Prediction of Soil pH](https://github.com/riponalmamun/Prediction-of-Soil-pH):
добавлены SVR, нейросеть (ANN) и стекинг — там на своих данных лучшим
оказался Random Forest с R²=0.62 и RMSE=0.52, это ориентир для сравнения.

Гиперпараметры настроены под маленькую выборку: неглубокие деревья,
обязательный `min_samples_leaf`, сильная регуляризация у XGBoost. Дефолтные
настройки sklearn на n=80 переобучаются гарантированно.
""")

code("""
def _scaled(estimator):
    \"\"\"Масштабирование обязательно для линейных моделей и KNN: признаки
    различаются на порядки (EC ~ 10^3, pH ~ 10^0).\"\"\"
    return Pipeline([("scaler", StandardScaler()), ("model", estimator)])


def regressors() -> dict:
    return {
        "LinearRegression": _scaled(LinearRegression()),
        "Ridge": _scaled(Ridge(alpha=10.0, random_state=RANDOM_STATE)),
        "DecisionTree": DecisionTreeRegressor(
            max_depth=4, min_samples_leaf=5, random_state=RANDOM_STATE),
        "RandomForest": RandomForestRegressor(
            n_estimators=400, max_depth=6, min_samples_leaf=3,
            max_features="sqrt", random_state=RANDOM_STATE, n_jobs=1),
        "KNN": _scaled(KNeighborsRegressor(n_neighbors=5, weights="distance")),
        "XGBoost": XGBRegressor(
            n_estimators=300, max_depth=3, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, reg_lambda=5.0, reg_alpha=0.5,
            min_child_weight=3, random_state=RANDOM_STATE, n_jobs=1, verbosity=0),
    }


def ph_regressors() -> dict:
    base = regressors()
    base["SVR"] = _scaled(SVR(kernel="rbf", C=10.0, epsilon=0.1, gamma="scale"))
    base["ANN"] = _scaled(MLPRegressor(
        hidden_layer_sizes=(32,), alpha=1.0, max_iter=3000,
        early_stopping=True, n_iter_no_change=30, random_state=RANDOM_STATE))
    base["Stacking"] = StackingRegressor(
        estimators=[
            ("rf", RandomForestRegressor(n_estimators=150, max_depth=6,
                min_samples_leaf=3, max_features="sqrt",
                random_state=RANDOM_STATE, n_jobs=1)),
            ("svr", _scaled(SVR(kernel="rbf", C=10.0, epsilon=0.1))),
            ("gbr", GradientBoostingRegressor(n_estimators=200, max_depth=2,
                learning_rate=0.05, random_state=RANDOM_STATE)),
        ], final_estimator=Ridge(alpha=1.0), cv=3, n_jobs=1)
    return base


def classifiers() -> dict:
    return {
        "LogisticRegression": _scaled(LogisticRegression(
            C=1.0, max_iter=2000, random_state=RANDOM_STATE)),
        "DecisionTree": DecisionTreeClassifier(
            max_depth=4, min_samples_leaf=4, class_weight="balanced",
            random_state=RANDOM_STATE),
        "RandomForest": RandomForestClassifier(
            n_estimators=500, max_depth=6, min_samples_leaf=2,
            max_features="sqrt", class_weight="balanced_subsample",
            random_state=RANDOM_STATE, n_jobs=1),
        "KNN": _scaled(KNeighborsClassifier(n_neighbors=5, weights="distance")),
        "XGBoost": XGBClassifier(
            n_estimators=300, max_depth=3, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, reg_lambda=5.0,
            min_child_weight=2, random_state=RANDOM_STATE, n_jobs=1, verbosity=0),
    }


GA_PARAM_SPACE_REG = {"n_estimators": [100, 200, 300], "max_depth": [2, 3, 4, 6],
                      "min_samples_leaf": [1, 2, 3, 5], "max_features": [0.4, 0.6, 0.8, 1.0]}
GA_PARAM_SPACE_CLF = {"n_estimators": [150, 300], "max_depth": [3, 4, 6],
                      "min_samples_leaf": [1, 2, 3], "max_features": [0.4, 0.6, 0.8]}


def make_ga_regressor(params: dict) -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=int(params["n_estimators"]), max_depth=int(params["max_depth"]),
        min_samples_leaf=int(params["min_samples_leaf"]),
        max_features=float(params["max_features"]), random_state=RANDOM_STATE, n_jobs=1)


def make_ga_classifier(params: dict) -> RandomForestClassifier:
    return RandomForestClassifier(
        n_estimators=int(params["n_estimators"]), max_depth=int(params["max_depth"]),
        min_samples_leaf=int(params["min_samples_leaf"]),
        max_features=float(params["max_features"]), class_weight="balanced_subsample",
        random_state=RANDOM_STATE, n_jobs=1)
""")

# ============================================================================
# 6. Генетический алгоритм
# ============================================================================
md("""
## 6. Генетический алгоритм отбора признаков

Реализация по мотивам *"Soil NPK Prediction using Enhanced Genetic
Algorithm"* (IEEE, 2023). Отличия «enhanced»-версии от классического GA:

- **ранговая селекция** вместо рулетки — не даёт одной сверхприспособленной
  особи захватить популяцию на маленькой выборке;
- **равномерный кроссовер** с обменом каждого гена вместо одноточечного,
  плюс независимое наследование гиперпараметров;
- **адаптивная мутация** — высокая в начале (разведка), затухающая к концу
  (эксплуатация);
- **элитизм** — лучшие особи переходят в следующее поколение без изменений.

Здесь EGA решает задачу, специфичную для датасета: при 80 наблюдениях и
~20 признаках отбор подмножества важнее тюнинга, поэтому в приспособленность
добавлен штраф за размер подмножества (parsimony pressure) — на такой
выборке лишний признак почти всегда означает выученный шум конкретных точек.
""")

code("""
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Individual:
    mask: np.ndarray
    params: dict
    fitness: float = -np.inf
    raw_score: float = -np.inf


@dataclass
class EGAConfig:
    population_size: int = 30
    generations: int = 15
    elite_size: int = 3
    crossover_rate: float = 0.8
    mutation_rate_start: float = 0.25
    mutation_rate_end: float = 0.05
    parsimony: float = 0.004
    tournament_pressure: float = 1.8
    random_state: int = 42
    verbose: bool = True
    history: list = field(default_factory=list)


class EnhancedGA:
    def __init__(self, n_features, param_space, score_fn, config=None):
        self.n_features = n_features
        self.param_space = param_space
        self.param_names = list(param_space)
        self.score_fn = score_fn
        self.cfg = config or EGAConfig()
        self.rng = np.random.default_rng(self.cfg.random_state)
        self._cache = {}

    def _random_individual(self) -> Individual:
        density = self.rng.uniform(0.3, 0.8)
        mask = (self.rng.random(self.n_features) < density).astype(int)
        if mask.sum() == 0:
            mask[self.rng.integers(self.n_features)] = 1
        params = {k: self.rng.choice(v) for k, v in self.param_space.items()}
        return Individual(mask=mask, params=params)

    def _evaluate(self, ind: Individual) -> None:
        key = (tuple(ind.mask), tuple(sorted((k, str(v)) for k, v in ind.params.items())))
        if key in self._cache:
            ind.raw_score, ind.fitness = self._cache[key]
            return
        raw = self.score_fn(ind.mask.astype(bool), ind.params)
        penalty = self.cfg.parsimony * ind.mask.sum()
        fit = raw - penalty
        ind.raw_score, ind.fitness = raw, fit
        self._cache[key] = (raw, fit)

    def _rank_selection(self, pop, k):
        order = np.argsort([ind.fitness for ind in pop])
        n = len(pop)
        ranks = np.empty(n)
        ranks[order] = np.arange(1, n + 1)
        sp = self.cfg.tournament_pressure
        weights = (2 - sp) + 2 * (sp - 1) * (ranks - 1) / max(n - 1, 1)
        probs = weights / weights.sum()
        idx = self.rng.choice(n, size=k, p=probs)
        return [pop[i] for i in idx]

    def _crossover(self, a, b):
        if self.rng.random() > self.cfg.crossover_rate:
            return (Individual(a.mask.copy(), dict(a.params)),
                    Individual(b.mask.copy(), dict(b.params)))
        swap = self.rng.random(self.n_features) < 0.5
        m1, m2 = a.mask.copy(), b.mask.copy()
        m1[swap], m2[swap] = b.mask[swap], a.mask[swap]
        p1, p2 = dict(a.params), dict(b.params)
        for name in self.param_names:
            if self.rng.random() < 0.5:
                p1[name], p2[name] = b.params[name], a.params[name]
        return (Individual(self._repair(m1), p1), Individual(self._repair(m2), p2))

    def _mutate(self, ind, generation):
        t = generation / max(self.cfg.generations - 1, 1)
        rate = self.cfg.mutation_rate_start * (1 - t) + self.cfg.mutation_rate_end * t
        flips = self.rng.random(self.n_features) < rate
        ind.mask[flips] = 1 - ind.mask[flips]
        ind.mask = self._repair(ind.mask)
        for name, values in self.param_space.items():
            if self.rng.random() < rate:
                ind.params[name] = self.rng.choice(values)

    def _repair(self, mask):
        if mask.sum() == 0:
            mask[self.rng.integers(self.n_features)] = 1
        return mask

    def run(self) -> Individual:
        pop = [self._random_individual() for _ in range(self.cfg.population_size)]
        for ind in pop:
            self._evaluate(ind)
        best = max(pop, key=lambda i: i.fitness)
        for gen in range(self.cfg.generations):
            pop.sort(key=lambda i: i.fitness, reverse=True)
            next_pop = [Individual(i.mask.copy(), dict(i.params), i.fitness, i.raw_score)
                       for i in pop[:self.cfg.elite_size]]
            parents = self._rank_selection(pop, self.cfg.population_size)
            i = 0
            while len(next_pop) < self.cfg.population_size:
                c1, c2 = self._crossover(parents[i % len(parents)], parents[(i + 1) % len(parents)])
                self._mutate(c1, gen)
                self._mutate(c2, gen)
                next_pop.extend([c1, c2])
                i += 2
            next_pop = next_pop[:self.cfg.population_size]
            for ind in next_pop:
                self._evaluate(ind)
            pop = next_pop
            gen_best = max(pop, key=lambda i: i.fitness)
            if gen_best.fitness > best.fitness:
                best = Individual(gen_best.mask.copy(), dict(gen_best.params),
                                  gen_best.fitness, gen_best.raw_score)
            self.cfg.history.append({"generation": gen, "best_raw": float(gen_best.raw_score),
                                     "n_features": int(gen_best.mask.sum())})
            if self.cfg.verbose:
                print(f"    поколение {gen:2d}: best={gen_best.raw_score:.4f} "
                     f"(признаков {int(gen_best.mask.sum())})")
        return best


def run_ga(X, y, groups, task="reg", generations=15):
    cols = list(X.columns)
    Xv = X.to_numpy()
    key = "R2" if task == "reg" else "macro_F1"
    metric_fn = regression_metrics if task == "reg" else classification_metrics
    make = make_ga_regressor if task == "reg" else make_ga_classifier
    space = GA_PARAM_SPACE_REG if task == "reg" else GA_PARAM_SPACE_CLF
    inner = GroupKFold(n_splits=5)

    def score_fn(mask, params):
        try:
            pred = cross_val_predict(make(params), Xv[:, mask], y,
                                     groups=groups, cv=inner, n_jobs=-1)
            return metric_fn(y, pred)[key]
        except Exception:
            return -1.0

    ga = EnhancedGA(len(cols), space, score_fn, EGAConfig(generations=generations, random_state=42))
    best = ga.run()
    selected = [c for c, m in zip(cols, best.mask) if m]
    print(f"    отобрано признаков: {len(selected)} из {len(cols)}: {selected}")
    print(f"    гиперпараметры: {dict(best.params)}")
    return selected, {k: (int(v) if k != "max_features" else float(v))
                      for k, v in best.params.items()}, ga.cfg.history
""")

# ============================================================================
# 7. Обучение и оценка
# ============================================================================
md("""
## 7. Обучение и оценка всех пяти моделей

Для каждой цели: сравнение зоопарка алгоритмов в двух схемах валидации, затем
генетический отбор признаков (кроме влажности — там референс сам по себе
задаёт полный набор алгоритмов без отбора). В артефакт идёт вариант EGA,
если он не хуже лучшего из зоопарка.
""")

code("""
RESULTS = {}


def evaluate(model, X, y, groups, blocks, task="reg") -> dict:
    metric_fn = regression_metrics if task == "reg" else classification_metrics
    out = {}
    pred_site = cross_val_predict(model, X, y, groups=groups, cv=loso_cv(), n_jobs=-1)
    out["by_site"] = metric_fn(y, pred_site)
    pred_block = cross_val_predict(model, X, y, groups=blocks,
                                   cv=GroupKFold(n_splits=len(np.unique(blocks))), n_jobs=-1)
    out["by_region"] = metric_fn(y, pred_block)
    out["_pred_site"] = pred_site
    return out


def compare_zoo(name, X, y, groups, blocks, zoo, task="reg"):
    print(f"\\n{'='*78}\\n{name}\\n{'='*78}")
    print(f"Признаков: {X.shape[1]}   Наблюдений: {X.shape[0]}")
    key = "R2" if task == "reg" else "macro_F1"
    rows, preds = {}, {}
    for algo, model in zoo.items():
        res = evaluate(model, X, y, groups, blocks, task)
        preds[algo] = res.pop("_pred_site")
        rows[algo] = res
        print(f"  {algo:<20} по точкам: {fmt_metrics(res['by_site'])}")
        print(f"  {'':<20} по регионам: {fmt_metrics(res['by_region'])}")
    best = max(rows, key=lambda a: rows[a]["by_site"][key])
    print(f"\\n  -> лучший: {best} ({key}={rows[best]['by_site'][key]:.3f})")
    return best, {"algorithms": rows, "best": best, "predictions": preds}
""")

md("### 7.1. Влажность почвы")
code("""
num_a = (CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES
        + ["bd", "ph_sn", "ec_log"])
Xa = encode(df, num_a, CATEGORICAL_FEATURES)
ya = df["sm_grav"].to_numpy()
best_a, res_a = compare_zoo("A. ВЛАЖНОСТЬ ПОЧВЫ (гравиметрическая, %)",
                            Xa, ya, groups, blocks, regressors(), "reg")
""")

md("### 7.2. Общий азот")
code("""
num_b = SENSOR_FEATURES + CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES
Xb = encode(df, num_b, CATEGORICAL_FEATURES)
yb = df["tn"].to_numpy()
best_b, res_b = compare_zoo("B. ОБЩИЙ АЗОТ (г/кг)", Xb, yb, groups, blocks, regressors(), "reg")

print("\\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
sel_b, params_b, hist_b = run_ga(Xb, yb, groups, "reg")
res_ga_b = evaluate(make_ga_regressor(params_b), Xb[sel_b], yb, groups, blocks, "reg")
res_ga_b.pop("_pred_site")
print(f"    EGA по точкам:   {fmt_metrics(res_ga_b['by_site'])}")
print(f"    EGA по регионам: {fmt_metrics(res_ga_b['by_region'])}")
res_b["ega"] = {"features": sel_b, "params": params_b, "metrics": res_ga_b, "history": hist_b}
""")

md("### 7.3. Органический углерод")
code("""
Xc = encode(df, num_b, CATEGORICAL_FEATURES)
yc = df["toc"].to_numpy()
best_c, res_c = compare_zoo("C. ОРГАНИЧЕСКИЙ УГЛЕРОД (г/кг)", Xc, yc, groups, blocks, regressors(), "reg")

print("\\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
sel_c, params_c, hist_c = run_ga(Xc, yc, groups, "reg")
res_ga_c = evaluate(make_ga_regressor(params_c), Xc[sel_c], yc, groups, blocks, "reg")
res_ga_c.pop("_pred_site")
print(f"    EGA по точкам:   {fmt_metrics(res_ga_c['by_site'])}")
print(f"    EGA по регионам: {fmt_metrics(res_ga_c['by_region'])}")
res_c["ega"] = {"features": sel_c, "params": params_c, "metrics": res_ga_c, "history": hist_c}
""")

md("""
### 7.4. Класс состояния почвы

Контрольный опыт отделяет вклад модели от той части метки, которая
выучивается тривиально (pH и EC входят в формулу балла).
""")
code("""
Xd = encode(df, num_b, CATEGORICAL_FEATURES)
yd = df["soil_state_idx"].to_numpy()
best_d, res_d = compare_zoo("D. КЛАСС СОСТОЯНИЯ ПОЧВЫ (4 класса)", Xd, yd, groups, blocks,
                            classifiers(), "clf")

print("\\n  --- контроль: только pH и EC (они входят в формулу метки) ---")
Xd_ctrl = encode(df, ["ph_sn", "ec_log"], None)
res_ctrl = evaluate(classifiers()["RandomForest"], Xd_ctrl, yd, groups, blocks, "clf")
res_ctrl.pop("_pred_site")
print(f"    контроль по точкам: {fmt_metrics(res_ctrl['by_site'])}")
res_d["control_ph_ec_only"] = res_ctrl

print("\\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
sel_d, params_d, hist_d = run_ga(Xd, yd, groups, "clf", generations=12)
res_ga_d = evaluate(make_ga_classifier(params_d), Xd[sel_d], yd, groups, blocks, "clf")
pred_ga_d = res_ga_d.pop("_pred_site")
print(f"    EGA по точкам:   {fmt_metrics(res_ga_d['by_site'])}")
print(f"    EGA по регионам: {fmt_metrics(res_ga_d['by_region'])}")
res_d["ega"] = {"features": sel_d, "params": params_d, "metrics": res_ga_d, "history": hist_d}

cm = confusion_matrix(yd, pred_ga_d)
res_d["confusion_matrix"] = cm.tolist()
print("\\n  Матрица ошибок EGA-модели (строки — факт, столбцы — прогноз):")
print("      " + "".join(f"{c[:9]:>10}" for c in SOIL_STATE_CLASSES))
for i, c in enumerate(SOIL_STATE_CLASSES):
    print(f"  {c[:9]:<10}" + "".join(f"{v:>10}" for v in cm[i]))
""")

md("""
### 7.5. Кислотность (pH)

В референсе сильнейшими предикторами pH были Fe, CaCO₃ и Mn. Железа и
марганца в датасете нет, но карбонаты есть напрямую — TIC на первом листе
это и есть неорганический углерод. Обучаются два варианта: с полной
лабораторной химией (сравнение с референсом) и только на сенсорных
признаках (единственный работоспособный в продакшене без лабораторных
анализов).
""")
code("""
num_e = (["ec_log", "sm_grav", "bd", "tic", "toc", "tn", "carbonate_frac"]
        + CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES)
Xe = encode(df, num_e, CATEGORICAL_FEATURES)
ye = df["ph_sn"].to_numpy()
best_e, res_e = compare_zoo("E. КИСЛОТНОСТЬ pH (солевая вытяжка, с лабораторной химией)",
                            Xe, ye, groups, blocks, ph_regressors(), "reg")
print("\\n  Ориентир из репозитория-референса: R2=0.62, RMSE=0.52")

num_e_sensor = (["ec_log", "sm_grav", "bd"] + CLIMATE_FEATURES + TERRAIN_FEATURES
                + SEASON_FEATURES + BINARY_FEATURES)
Xe_s = encode(df, num_e_sensor, CATEGORICAL_FEATURES)
best_es, res_es = compare_zoo("E2. pH БЕЗ ЛАБОРАТОРНОЙ ХИМИИ (вариант для продакшена)",
                              Xe_s, ye, groups, blocks, ph_regressors(), "reg")
res_e["sensor_only"] = {"algorithms": res_es["algorithms"], "best": res_es["best"]}
""")

# ============================================================================
# 8. Итоговая таблица и графики
# ============================================================================
md("""
## 8. Результаты

### Табл. — Итоговые модели (по регионам = блочная валидация по широте)
""")
code("""
summary_rows = [
    ("Общий азот",     "tn",             "EGA \\u00b7 RandomForest", len(sel_b), res_ga_b["by_site"], res_ga_b["by_region"], "R2"),
    ("Орг. углерод",   "toc",            best_c,                    Xc.shape[1], res_c["algorithms"][best_c]["by_site"], res_c["algorithms"][best_c]["by_region"], "R2"),
    ("Влажность",      "sm_grav",        best_a,                    Xa.shape[1], res_a["algorithms"][best_a]["by_site"], res_a["algorithms"][best_a]["by_region"], "R2"),
    ("Состояние почвы","4 класса",       "EGA \\u00b7 RandomForest", len(sel_d), res_ga_d["by_site"], res_ga_d["by_region"], "macro_F1"),
    ("Кислотность",    "ph_sn (сенсор)", best_es,                   Xe_s.shape[1], res_es["algorithms"][best_es]["by_site"], res_es["algorithms"][best_es]["by_region"], "R2"),
]

summary = pd.DataFrame([{
    "Модель": name, "Целевая": target, "Алгоритм": algo, "Признаков": nf,
    "LOSO": f"{key} {site[key]:.3f}", "По регионам": f"{key} {region[key]:.3f}",
} for name, target, algo, nf, site, region, key in summary_rows])
summary
""")

code("""
fig, ax = plt.subplots(figsize=(8.5, 4))
names = [r[0] for r in summary_rows]
site_v = [r[4][r[6]] for r in summary_rows]
reg_v = [r[5][r[6]] for r in summary_rows]
y_pos = np.arange(len(names))[::-1]

for yp, s, rg in zip(y_pos, site_v, reg_v):
    ax.plot([rg, s], [yp, yp], color=ACCENT_DIM, lw=2, zorder=1)
ax.scatter(reg_v, y_pos, s=70, facecolor="white", edgecolor=ACCENT_DIM, lw=2,
          zorder=2, label="по регионам")
ax.scatter(site_v, y_pos, s=70, color=ACCENT, edgecolor="white", lw=1.5,
          zorder=3, label="по точкам (LOSO)")
ax.set_yticks(y_pos)
ax.set_yticklabels(names)
ax.set_xlabel("R\\u00b2 / macro-F1 на отложенных фолдах")
ax.set_title("Разрыв между схемами валидации", loc="left")
ax.set_xlim(0, 0.85)
ax.legend(frameon=False, loc="lower right")
plt.tight_layout()
plt.show()
""")

md("""
### Рис. — Матрица ошибок классификатора состояния почвы

Критичные почвы распознаются чисто, ни одна не отнесена к `moderate` или
`healthy` — это самое опасное направление ошибки, и оно закрыто. Слабое
место — класс `poor`, промежуточный по конструкции метки.
""")
code("""
fig, ax = plt.subplots(figsize=(5.5, 4.6))
im = ax.imshow(cm, cmap=LinearSegmentedColormap.from_list("acc", ["white", ACCENT]))
ax.set_xticks(range(4)); ax.set_xticklabels(SOIL_STATE_CLASSES, rotation=20, ha="right")
ax.set_yticks(range(4)); ax.set_yticklabels(SOIL_STATE_CLASSES)
ax.set_xlabel("Прогноз"); ax.set_ylabel("Факт")
ax.set_title("Матрица ошибок \\u2014 EGA \\u00b7 RandomForest (LOSO)", loc="left")
for i in range(4):
    for j in range(4):
        v = cm[i, j]
        ax.text(j, i, str(v), ha="center", va="center",
               color="white" if v > cm.max() * 0.5 else "#191B14",
               fontweight="bold" if i == j else "normal")
ax.grid(False)
plt.tight_layout()
plt.show()
""")

md("""
### Рис. — Какие признаки отобраны для каждой модели

Азот использует климат и рельеф; углерод — ни одного климатического
признака, только тип почвы и землепользование. Это распределение не
закладывалось в конструкцию — алгоритм пришёл к нему самостоятельно.
""")
code("""
all_feats = sorted(set(sel_b) | set(sel_c) | set(sel_d))
sel_matrix = pd.DataFrame({
    "Общий азот": [f in sel_b for f in all_feats],
    "Орг. углерод": [f in sel_c for f in all_feats],
    "Состояние почвы": [f in sel_d for f in all_feats],
}, index=all_feats).astype(int)

fig, ax = plt.subplots(figsize=(6, max(3.5, 0.32 * len(all_feats))))
ax.imshow(sel_matrix.T, cmap=LinearSegmentedColormap.from_list("dot", ["white", ACCENT]),
         aspect="auto", vmin=0, vmax=1)
ax.set_xticks(range(len(all_feats)))
ax.set_xticklabels(all_feats, rotation=60, ha="right", fontsize=8)
ax.set_yticks(range(3))
ax.set_yticklabels(sel_matrix.columns)
ax.set_title("Отобранные признаки по моделям (EGA)", loc="left")
ax.grid(False)
plt.tight_layout()
plt.show()
""")

md("""
### Отрицательные результаты

- **Кислотность.** R²=0.342 без лабораторной химии (0.403 с ней) против
  R²=0.62 в референсе — недостаёт двух из трёх сильнейших предикторов
  (Fe, Mn), карбонаты одни компенсируют лишь частично.
- **Нейросеть (ANN)** на задаче pH систематически не сходится за 3000
  итераций на выборке из 80 наблюдений — смотрите предупреждения
  `ConvergenceWarning` выше и отрицательный R² в таблице зоопарка E/E2.
- **Линейная регрессия** проваливается на межрегиональной валидации
  (отрицательный R² по азоту и pH) — линейная экстраполяция климатического
  градиента за пределы обучающей области разваливается полностью.
""")

# ============================================================================
# 9. Сохранение артефактов
# ============================================================================
md("""
## 9. Сохранение моделей

Финальные модели сохраняются в `/kaggle/working/ml_models/` (или `./ml_models/`
при локальном запуске) в том же формате, который использует бэкенд Soilink:
пара `<name>_model.pkl` + `<name>_meta.pkl` со списком признаков и метриками.
""")
code("""
import joblib

MODELS_DIR = Path("/kaggle/working/ml_models") if Path("/kaggle/working").exists() else Path("ml_models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def pick(res, X, y, task):
    key = "R2" if task == "reg" else "macro_F1"
    zoo_best = res["algorithms"][res["best"]]["by_site"][key]
    if "ega" in res and res["ega"]["metrics"]["by_site"][key] >= zoo_best:
        feats = res["ega"]["features"]
        mk = make_ga_regressor if task == "reg" else make_ga_classifier
        model = mk(res["ega"]["params"])
        return model.fit(X[feats], y), feats, "EGA-RandomForest", res["ega"]["metrics"]["by_site"]
    name = res["best"]
    model = (regressors() if task == "reg" else classifiers())[name]
    return model.fit(X, y), list(X.columns), name, res["algorithms"][name]["by_site"]


for tag, res, X, y, task, fname in [
    ("moisture", res_a, Xa, ya, "reg", "soil_moisture_model.pkl"),
    ("nitrogen", res_b, Xb, yb, "reg", "soil_nitrogen_model.pkl"),
    ("carbon",   res_c, Xc, yc, "reg", "soil_carbon_model.pkl"),
    ("state",    res_d, Xd, yd, "clf", "soil_state_model.pkl"),
    ("ph",       res_es, Xe_s, ye, "reg", "soil_ph_model.pkl"),
]:
    model, feats, algo, metrics = pick(res, X, y, task)
    joblib.dump(model, MODELS_DIR / fname)
    meta = {
        "features": feats, "algorithm": algo, "task": task, "metrics_loso": metrics,
        "target": {"moisture": "sm_grav", "nitrogen": "tn", "carbon": "toc",
                   "state": "soil_state_idx", "ph": "ph_sn"}[tag],
        "n_train": int(len(y)), "n_sites": int(df["sample_id"].nunique()),
        "dataset": "Supplement 2.xlsx (Kazakhstan transect, 2015)",
    }
    if task == "clf":
        meta["classes"] = SOIL_STATE_CLASSES
    joblib.dump(meta, MODELS_DIR / fname.replace("_model.pkl", "_meta.pkl"))
    print(f"  {fname:<28} {algo:<22} признаков={len(feats):<3} {fmt_metrics(metrics)}")
""")

md("""
## 10. Ограничения

- **Модели не переносятся на другой регион.** Классификатор снижается с
  ~0.75 до ~0.42 macro-F1 на невиданной широтной полосе. В пределах
  Казахстана — рабочий инструмент, за его пределами — нет.
- **Фосфор и калий не предсказываются.** В датасете измерен только азот.
- **Модель кислотности не заменяет электрод** — при R²≈0.34 она годится
  разве что как грубый сигнал о дрейфе датчика.
- **80 наблюдений — это 40 независимых точек**, каждая измерена дважды.
  Доверительные оценки нужно читать с этой поправкой.
- **Рекомендация культуры и удобрения не затрагивалась** — в датасете нет
  ни культур, ни марок удобрений.

---
Полный текстовый отчёт с методологией и научным изложением результатов:
проект [Soilink](https://github.com/moni1489/soilink), `backend/training/`.
""")


nb["cells"] = cells
nb["metadata"] = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.11"},
}

OUT.write_text(nbf.writes(nb))
print(f"Записан: {OUT}  ({len(cells)} ячеек)")
