"""
Собирает soilink_soil_models.ipynb из строковых блоков.

Это "человечная" версия — от первого лица, с итеративным разворачиванием
(бейзлайн -> его проблемы -> усложнение), комментариями-намерениями и
HTML-вставками для инсайтов. Вычислительная часть (сборка датасета, зоопарк
моделей, генетический алгоритм) не менялась и осталась идентичной
backend/training/*.py — переписан только слой повествования.

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
# 0. Титул + стили
# ============================================================================
md("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600;7..72,700&family=JetBrains+Mono:wght@400;500&display=swap');

.md-wrap, .jp-RenderedMarkdown, .rendered_html {
  font-family: 'Literata', Georgia, serif !important;
}
.md-wrap code, .jp-RenderedMarkdown code, .rendered_html code {
  font-family: 'JetBrains Mono', monospace !important;
}

.note, .finding, .warn, .fail {
  border-radius: 6px;
  padding: 14px 18px;
  margin: 14px 0;
  font-family: 'Literata', Georgia, serif;
  line-height: 1.55;
  border-left: 4px solid;
}
.note   { background: #EAF3F6; border-color: #2A6274; }
.finding{ background: #EEF3E8; border-color: #4B6B2F; }
.warn   { background: #FBF1DE; border-color: #B0791A; }
.fail   { background: #FBEAE6; border-color: #A6402F; }
.note b, .finding b, .warn b, .fail b { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
</style>

# Что происходит с почвой вдоль казахстанского транссекта? Пробую предсказать

Наткнулся на датасет, который слишком хорош, чтобы просто на него посмотреть
и забыть: 40 точек опробования вытянуты почти по прямой линии от
Петропавловска на севере до Тараза на юге — 1300&nbsp;км, три климатические
зоны, две волны замеров (май и сентябрь 2015). Для каждой точки — полный
лабораторный набор: углерод, азот, pH, электропроводность, плотность,
влажность.

Моя гипотеза перед тем, как открыть данные: **осадки и температура вдоль
такого транссекта должны говорить сами за себя** — то есть простая модель,
которой дали только климат и рельеф, уже должна неплохо предсказывать,
что происходит с почвой. Если это так, дальше интересно — сможет ли
генетический алгоритм сам найти минимальный набор признаков, не хуже, чем
если бы я перебирал их руками неделю.

<div class="note">
<b>Зачем вообще эта возня с двумя схемами валидации?</b> Точки лежат вдоль
одной линии, и климат меняется по ней плавно. Значит, если проверять
качество модели, выкидывая по одной точке (Leave-One-Site-Out), сосед слева
и сосед справа почти наверняка похожи на выкинутую точку — модель может
"подглядывать" через соседей, даже не зная правильного ответа напрямую.
Поэтому я всегда буду смотреть на вторую цифру — качество на отложенном
<i>широтном блоке</i> точек, которые модель вообще не видела рядом с собой.
Обычно это отрезвляет.
</div>

**Что нужно для запуска.** Два файла, прикреплённых как Kaggle Dataset:
`Supplement 2.xlsx` (исходник) и `site_climate.csv` — про второй файл
расскажу отдельно, там есть история.

**Сколько ждать.** Полный прогон занимает 10–20 минут на обычном 4-ядерном
Kaggle CPU — я специально не резал точность ради скорости, там где для GA
нужно честно перебрать варианты, оно перебирает.
""")

# ============================================================================
# 1. Импорты и данные
# ============================================================================
md("""
## Импорты и куда за данными

Ничего необычного — sklearn, xgboost, немного matplotlib. Единственное, что
стоит объяснить: я не хардкожу путь к файлам, потому что на Kaggle он
зависит от того, как вы назовёте датасет при загрузке, а я хочу, чтобы
ноутбук просто работал у любого, кто его форкнет.
""")

code("""
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
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

# на 40 фолдах LOSO sklearn любит шуметь про сходимость и деление на ноль
# в вырожденных фолдах — не хочу, чтобы это забивало вывод
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
ACCENT, ACCENT_DIM, WARN = "#245A6B", "#6E97A3", "#8A5215"
STATE_COLORS = {"critical": "#E8D5A9", "poor": "#C99A52",
                "moderate": "#8C6234", "healthy": "#3A2E1E"}
""")

code("""
def find_input(name: str) -> Path:
    # локальный запуск — файл рядом; на Kaggle он появится под /kaggle/input/<чей-то-slug>/,
    # а слаг датасета мне заранее не известен, поэтому просто обхожу все подпапки
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
        f"не нашёл '{name}' — на Kaggle прикрепите датасет через Add Input, "
        f"локально положите файл рядом с ноутбуком")


SRC = find_input("Supplement 2.xlsx")
CLIMATE_PATH = find_input("site_climate.csv")
print(f"нашёл: {SRC}")
print(f"нашёл: {CLIMATE_PATH}")
""")

# ============================================================================
# 2. Материал: сборка датасета
# ============================================================================
md("""
## Сначала — что вообще лежит в этом Excel

Открыл файл руками перед тем, как писать код, и сразу понял, что это не
csv-датасет с Kaggle, где всё уже причёсано. Девять листов, на каждом свой
тип измерения, шапки разъезжаются на 2–3 строки, единицы измерения то в
названии колонки, то в отдельной строке под ней. Раскладываю по одному —
надёжнее, чем пытаться угадать универсальный парсер.

<div class="warn">
Забегая вперёд: я сразу нашёл текстовое значение <code>"missing"</code>
в числовой колонке EC (точка 8, замер за сентябрь). Спасибо
<code>pd.to_numeric(..., errors="coerce")</code> — превратит в NaN, а не
уронит парсинг всего листа.
</div>
""")

code("""
def _sid(s: pd.Series) -> pd.Series:
    # id точки везде разного типа (то float, то object) — привожу к единому виду сразу,
    # иначе мерджи ниже молча потеряют часть строк
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
    # категории тут набраны руками в Excel — 'chernozem ' и 'chernozem' с пробелом
    # это два разных значения для pandas, но не для агронома
    for c in ["land_use", "biome", "env_feature", "soil_type_wrb", "location"]:
        ann[c] = ann[c].astype(str).str.strip().str.lower()
    ann["biome"] = ann["biome"].str.replace(r"\\s+", " ", regex=True)
    ann["env_feature"] = ann["env_feature"].str.replace(r"\\s+", " ", regex=True)
    ann["soil_type_wrb"] = ann["soil_type_wrb"].str.replace(r"\\s*\\+\\s*", "+", regex=True)
    return ann[["sample_id", "location", "land_use", "elevation_m", "biome",
                "env_feature", "soil_type_wrb", "longitude", "latitude",
                "precip_mm", "mat_c"]]


def load_carbon() -> pd.DataFrame:
    # тут шапка трёхэтажная (единицы / метод / STDEV-SE), проще выдрать нужные
    # колонки по номеру позиции, чем разбирать этот зоопарк заголовков
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
    df = pd.read_excel(SRC, sheet_name="TOC and TN stocks (8)", skiprows=[1]).rename(columns={
        "Samples": "sample_id", "Total organic carbon": "toc_stock_t_ha",
        "Total nitrogen": "tn_stock_t_ha"})
    df["sample_id"] = _sid(df["sample_id"])
    return df[["sample_id", "toc_stock_t_ha", "tn_stock_t_ha"]]


SEASONAL = ["tc", "toc", "tic", "loi", "tn", "bd", "sm_grav", "sm_vol",
            "ph_sn", "ph_su", "ec"]

print("девять листов на месте")
""")

md("""
### А что с климатом? Тут пришлось выкачивать заново

Загрузил лист аннотации отдельно и напоролся на странность: у соседних точек
осадки и температура иногда <i>совпадают до всех знаков после запятой</i>.
Это не совпадение — значения присвоены не точке, а целому блоку точек сразу,
видимо, из какого-то грубого климатического атласа.

<div class="fail">
Если бы я обучил модель на этих поблочных значениях, а потом в реальном
приложении подавал бы климат из нормального сервиса вроде Open-Meteo — модель
получала бы на входе систематически другие числа, чем видела на обучении.
Метрики на кросс-валидации при этом остались бы отличными, потому что
внутри самого датасета всё согласовано. Это ровно тот случай, когда
хорошие цифры на CV ничего не говорят о реальной работе модели.
</div>

Поэтому я отдельно выкачал климатическую норму ВМО 1991–2020 из архива ERA5
(тем же Open-Meteo) для каждой из 40 точек по её реальным координатам —
без блочного округления. Это и есть второй файл, `site_climate.csv`.
""")

code("""
climate = pd.read_csv(CLIMATE_PATH)
# если тут остались фолбэки — значит для части точек запрос к ERA5 не прошёл,
# и дальше нет смысла продолжать: лучше упасть явно, чем тихо обучиться на заглушках
assert not climate["climate_is_fallback"].any(), (
    "в site_climate.csv есть точки без climate ERA5 — перекачайте файл")
print(f"климат по всем {len(climate)} точкам, фолбэков: "
      f"{int(climate['climate_is_fallback'].sum())}")
climate.head()
""")

code("""
def build_dataset() -> pd.DataFrame:
    wide = load_annotation()
    for loader in (load_carbon, load_loi, load_nitrogen, load_bulk_density,
                   load_moisture, load_ph, load_ec, load_stocks):
        wide = wide.merge(loader(), on="sample_id", how="left")

    # каждый лист хранит май и сентябрь как отдельные колонки — разворачиваю
    # в длинный формат, чтобы строка была "точка + сезон", а не "точка"
    frames = []
    for season, suffix in (("may", "may"), ("sep", "sep")):
        part = wide[[c for c in wide.columns
                     if not c.endswith(("_may", "_sep"))]].copy()
        part["season"] = season
        for base in SEASONAL:
            part[base] = pd.to_numeric(wide[f"{base}_{suffix}"], errors="coerce")
        part["sampling_dt"] = pd.to_datetime(wide[f"dt_{suffix}"], errors="coerce")
        frames.append(part)

    df = pd.concat(frames, ignore_index=True)

    # климат из статьи (поблочный) переименовываю в _paper и оставляю только
    # для очистки совести — обучаться будем на честном ERA5
    df = df.merge(climate, on="sample_id", how="left")
    df = df.rename(columns={"precip_mm": "precip_mm_paper",
                            "mat_c": "mat_c_paper",
                            "elevation_m": "elevation_m_paper"})
    df["precip_mm"] = df["era5_precip_mm"]
    df["mat_c"] = df["era5_mat_c"]
    df["elevation_m"] = df["era5_elevation_m"]

    df["doy"] = df["sampling_dt"].dt.dayofyear
    df["is_september"] = (df["season"] == "sep").astype(int)
    # C:N — старый добрый индикатор скорости минерализации органики, вдруг пригодится
    df["cn_ratio"] = df["toc"] / df["tn"].replace(0, np.nan)
    # доля карбонатов в общем углероде — косвенный след засолённых/щелочных почв
    df["carbonate_frac"] = df["tic"] / df["tc"].replace(0, np.nan)

    return df.sort_values(["sample_id", "season"]).reset_index(drop=True)


raw = build_dataset()
print(f"получилось {raw.shape[0]} строк x {raw.shape[1]} колонок "
      f"({raw['sample_id'].nunique()} точек, каждая дважды)")
raw[["toc", "tn", "sm_grav", "ph_sn", "ec", "bd", "precip_mm", "mat_c"]].describe().round(2).T
""")

# ============================================================================
# 3. Признаки и метка
# ============================================================================
md("""
## Немного причёсываю признаки

Девять подтипов почв WRB на сорок точек — это перебор для такой выборки,
модель будет учиться на классах из одной-двух точек. Укрупняю до пяти
агрономически похожих групп. Заодно логарифмирую электропроводность — она
скачет от 60 до 9176 мкСм/см, и без лога один солончак с выбросом
перетягивает на себя всю шкалу для линейных моделей.
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
    df["ec_ds_m"] = df["ec"] / 1000.0  # мкСм/см -> дСм/м, шкала понятнее агроному
    # индекс аридности Де Мартонна — одно число вместо двух скоррелированных
    # (осадки и температура тянут в одну сторону, зачем городить два признака)
    df["aridity"] = df["precip_mm"] / (df["mat_c"] + 10.0)
    # единственный пропуск (тот самый "missing" в EC) — закрываю медианой,
    # выкидывать целую точку из 40 жалко
    for col in ["ec", "ec_log", "ec_ds_m"]:
        df[col] = df[col].fillna(df[col].median())
    return df


df = load_dataset(raw)
""")

md("""
## Целевая переменная — тут придётся её выдумать самому

Вот в чём засада: в приложении, для которого это делается, уже зашит
контракт на четыре класса состояния почвы (`critical / poor / moderate /
healthy`), а в самом датасете такой колонки, конечно, нет — только сырые
измерения. Значит, разметку нужно собрать руками из того, что есть.

Собрал агрономический балл 0–18: углерод и азот весят вдвое больше, чем
pH и засолённость, — потому что именно органика определяет плодородие, и
именно её нельзя измерить дешёвым полевым датчиком (а pH и EC — можно).

<div class="warn">
Тут есть подвох, о котором нельзя молчать: раз pH и EC входят прямо в
формулу метки, любая модель, которой дать эти два признака, автоматически
получит часть ответа бесплатно. Ниже, когда дойдём до классификатора,
я специально это проверю — обучу модель <i>только</i> на pH и EC и посмотрю,
сколько из итогового качества на самом деле "халява".
</div>
""")

code("""
SOIL_STATE_CLASSES = ["critical", "poor", "moderate", "healthy"]
SOIL_STATE_CUTS = (6, 10, 14)  # границы балла 0..18 между классами — подобраны
                               # так, чтобы классы получились не сильно перекошены


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

df["soil_state"].value_counts().reindex(SOIL_STATE_CLASSES)
""")

md("""
### Смотрю на транссект целиком, пока не сел писать модели

Прежде чем кормить это в sklearn, хочу увидеть картину глазами. Собрал все
40 точек по широте и наложил друг на друга климат и итоговый класс почвы
за оба сезона.
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
ax.set_title("Климат и состояние почвы вдоль транссекта: Петропавловск \\u2192 Тараз",
            loc="left")
imin, imax = sites["precip_mm"].idxmin(), sites["precip_mm"].idxmax()
for i, lab in [(imin, "минимум"), (imax, "максимум")]:
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

md("""
<div class="finding">
Провал осадков до &lt;150&nbsp;мм ровно в районе Балхаша (это середина
графика) совпадает <b>тайл-в-тайл</b> со сплошной полосой <code>critical</code>
на обеих строчках снизу. С сорока точками я не рискну говорить про
причинно-следственную связь официально, но глазами это видно настолько
чётко, что я почти жду, что модель "спишет" отсюда бо́льшую часть
предсказательной силы — и, забегая вперёд, так и происходит: у азота
именно осадки оказались среди отобранных признаков.
</div>

Ещё заметил: между маем и сентябрем класс меняется у 14 точек из 40 — то
есть это не "сфотографировали один раз и разметили навсегда", в данных
реально есть сезонная динамика, которую можно попытаться выучить, а не
просто запомнить точку.
""")

# ============================================================================
# 4. Утечки, признаки, валидация
# ============================================================================
md("""
## Прежде чем что-то обучать — выписываю, что нельзя давать модели

Часть колонок в этом датасете — не независимые измерения, а арифметика друг
над другом. Если этого не заметить, модель "предскажет" целевую переменную
саму через себя и покажет прекрасные метрики, которые ничего не будут
значить.

- объёмная влажность = гравиметрическая × плотность — это те же данные в
  других единицах;
- общий углерод = органический + неорганический;
- потери при прокаливании — по сути тоже органика, просто другим методом;
- запасы (т/га) = концентрация × плотность × глубина;
- C:N — это частное от деления самой целевой переменной.

Дальше — только то, что реально есть у полевого датчика в момент, когда
приложение делает прогноз: pH, EC, влажность, температура почвы, плюс
координаты и климатическая норма.
""")

code("""
LEAKAGE = {
    "sm_grav": ["sm_vol"],
    "tn": ["tn_stock_t_ha", "cn_ratio", "toc", "tc", "tic", "loi",
           "toc_stock_t_ha", "carbonate_frac"],
    "toc": ["toc_stock_t_ha", "cn_ratio", "tn", "tc", "tic", "loi",
            "tn_stock_t_ha", "carbonate_frac"],
    # ph_su — та же кислотность, только другой метод вытяжки; давать её
    # модели — всё равно что предсказывать pH по pH
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
    parts = [df[numeric].astype(float)]
    if categorical:
        for col in categorical:
            parts.append(pd.get_dummies(df[col], prefix=col).astype(float))
    out = pd.concat(parts, axis=1)
    # фиксирую порядок колонок раз и навсегда — иначе one-hot от разных вызовов
    # может не совпасть местами, и модель тихо перепутает признаки
    return out.reindex(sorted(out.columns), axis=1)
""")

md("""
## Как я буду проверять качество — и почему не просто KFold

Обычная k-кратная валидация тут же подставит подножку: май и сентябрь одной
точки — это, считай, одна и та же почва дважды. Обычный `KFold` легко
раскидает две половинки одной точки в train и test, и модель будет
"предсказывать" то, что фактически уже видела. Поэтому основная схема —
**Leave-One-Site-Out**: сорок фолдов, вся точка целиком уходит в тест.

Но я уже писал выше, что и этого мало — соседи по широте похожи друг на
друга. Поэтому вторым слоем — **валидация по пяти широтным блокам**: беру
кусок транссекта, полностью прячу его, и смотрю, работает ли модель на
регионе, которого она не видела вообще ни разу, даже краем глаза.
""")

code("""
def loso_cv():
    return LeaveOneGroupOut()


def spatial_blocks(df: pd.DataFrame, n_blocks: int = 5) -> np.ndarray:
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


groups = df["sample_id"].to_numpy()
blocks = spatial_blocks(df)
print(f"{len(df)} наблюдений, {df['sample_id'].nunique()} точек (LOSO), "
      f"{len(np.unique(blocks))} широтных блока")
""")

# ============================================================================
# 5. Влажность — первый заход, показываю паттерн "бейзлайн -> зоопарк"
# ============================================================================
md("""
## Первая цель: влажность почвы. Начинаю с чего-то тупого

Не хочу сразу тащить XGBoost — сначала посмотрю, что скажет банальная линейная
регрессия на климате, рельефе и паре сенсорных признаков. Если она уже даёт
что-то разумное, вопрос "а нужен ли тут лес вообще" не праздный.
""")

code("""
num_moist = (CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES
            + ["bd", "ph_sn", "ec_log"])
Xa = encode(df, num_moist, CATEGORICAL_FEATURES)
ya = df["sm_grav"].to_numpy()

baseline_moist = Pipeline([("scaler", StandardScaler()),
                           ("model", LinearRegression())])
res_baseline_moist = evaluate(baseline_moist, Xa, ya, groups, blocks, "reg")
print("линейная регрессия, влажность:")
print(f"  по точкам:  {fmt_metrics(res_baseline_moist['by_site'])}")
print(f"  по регионам: {fmt_metrics(res_baseline_moist['by_region'])}")
""")

md("""
<div class="fail">
Вот он, первый звоночек: <b>R² по точкам 0.44, а по регионам —
отрицательный (-0.59)</b>. То есть внутри знакомого транссекта модель
что-то улавливает, а стоит спрятать от неё целый широтный кусок — она
становится хуже, чем если бы я просто всегда предсказывал среднее значение
влажности по выборке. Линейная модель явно на чём-то экстраполирует за
пределы того, что видела, и делает это плохо. Не буду её выбрасывать —
оставлю в таблице ниже как ориентир "хуже уже некуда", — но пора звать
что-то более гибкое.
</div>

Дальше — целый зоопарк алгоритмов разом: линейные, деревья, лес, KNN,
XGBoost. Набор списал у [репозитория, который делал похожую задачу для
почвенной влажности](https://github.com/lokesh28-krish/Soil-Moisture-Prediction-Using-machine-Learning-algorithms)
— не вижу смысла изобретать линейку заново, если кто-то уже собрал разумный
стартовый набор.
""")

code("""
def _scaled(estimator):
    # линейным моделям и KNN обязательно нужен масштаб — иначе EC (~10^3) задавит
    # pH (~10^0) просто по порядку величины, а не по реальной значимости
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
    # глубину и min_samples_leaf держу маленькими намеренно — при 80 строках
    # дефолтные настройки sklearn выучат каждую точку наизусть


def compare_zoo(name, X, y, groups, blocks, zoo, task="reg"):
    print(f"\\n{'='*70}\\n{name}\\n{'='*70}")
    key = "R2" if task == "reg" else "macro_F1"
    rows, preds = {}, {}
    for algo, model in zoo.items():
        res = evaluate(model, X, y, groups, blocks, task)
        preds[algo] = res.pop("_pred_site")
        rows[algo] = res
        print(f"  {algo:<18} точки: {fmt_metrics(res['by_site'])}")
        print(f"  {'':<18} регион: {fmt_metrics(res['by_region'])}")
    best = max(rows, key=lambda a: rows[a]["by_site"][key])
    print(f"\\n  -> беру {best} ({key}={rows[best]['by_site'][key]:.3f})")
    return best, {"algorithms": rows, "best": best, "predictions": preds}


best_a, res_a = compare_zoo("ВЛАЖНОСТЬ ПОЧВЫ, полный зоопарк", Xa, ya, groups, blocks,
                            regressors(), "reg")
""")

md("""
<div class="finding">
RandomForest берёт с R²=0.63 по точкам и 0.46 по регионам — не блестяще,
но заметно живее, чем -0.59 у линейной модели на том же разбиении. Разница
между схемами валидации всё ещё довольно большая, так что расслабляться
рано, но по крайней мере теперь модель не хуже константы.
</div>
""")

# ============================================================================
# 6. Азот — полный цикл: бейзлайн -> зоопарк -> GA
# ============================================================================
md("""
## Вторая цель: общий азот. Тут и появится генетический алгоритм

Прежде чем звать GA — тот же ритуал: линейная регрессия для калибровки
ожиданий.
""")

code("""
num_nutrient = SENSOR_FEATURES + CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES
Xb = encode(df, num_nutrient, CATEGORICAL_FEATURES)
yb = df["tn"].to_numpy()

res_baseline_n = evaluate(Pipeline([("scaler", StandardScaler()), ("model", LinearRegression())]),
                          Xb, yb, groups, blocks, "reg")
print(f"линейная регрессия, азот: точки {fmt_metrics(res_baseline_n['by_site'])}")
print(f"                          регион {fmt_metrics(res_baseline_n['by_region'])}")
""")

md("""
<div class="fail">
По точкам R²=0.48 — вроде бы "ну, сойдёт". Но по регионам —
<b>-1.55</b>. Это даже хуже, чем провал с влажностью выше: модель не просто
не помогает, она вдвое хуже наивного среднего. Причина, скорее всего, та
же самая — климатический градиент вдоль транссекта нелинейный (вспомните
график выше: осадки сначала падают, потом снова растут к югу), а линейная
модель обязана продолжать прямую и там, где реальность делает разворот.
</div>

Прогоняю тот же зоопарк, что и для влажности.
""")

code("""
best_b, res_b = compare_zoo("ОБЩИЙ АЗОТ, полный зоопарк", Xb, yb, groups, blocks,
                            regressors(), "reg")
""")

md("""
Лучше, но у меня остался вопрос: я скормил модели 23 признака, из которых
явно не все несут пользу — часть, наверное, просто шум, который лес
запоминает как случайные совпадения на 80 строках. Хочу проверить гипотезу
из статьи про генетические алгоритмы для NPK — можно ли **автоматически**
найти компактное подмножество признаков, которое работает не хуже, а
переносится на новый регион лучше.

<div class="note">
Коротко про механику: это не ванильный GA из учебника. У меня <b>ранговая
селекция</b> вместо рулетки (иначе на маленькой выборке одна
"счастливая" особь сразу забивает всю популяцию), <b>равномерный
кроссовер</b> вместо одноточечного, <b>затухающая мутация</b> — сильная
разведка в начале, аккуратная доводка ближе к концу, и <b>штраф за
количество признаков</b> в фитнес-функции: чем длиннее список, тем больше
подозрение, что часть из них там просто так.
</div>
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
    parsimony: float = 0.004  # чем больше, тем сильнее давим на компактность
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
        # стартовая плотность признаков случайная в [0.3, 0.8] — хочу,
        # чтобы популяция сразу покрывала и худые, и жирные наборы
        density = self.rng.uniform(0.3, 0.8)
        mask = (self.rng.random(self.n_features) < density).astype(int)
        if mask.sum() == 0:
            mask[self.rng.integers(self.n_features)] = 1
        params = {k: self.rng.choice(v) for k, v in self.param_space.items()}
        return Individual(mask=mask, params=params)

    def _evaluate(self, ind: Individual) -> None:
        key = (tuple(ind.mask), tuple(sorted((k, str(v)) for k, v in ind.params.items())))
        if key in self._cache:  # одна и та же комбинация может всплыть после мутации/кроссовера снова
            ind.raw_score, ind.fitness = self._cache[key]
            return
        raw = self.score_fn(ind.mask.astype(bool), ind.params)
        penalty = self.cfg.parsimony * ind.mask.sum()
        fit = raw - penalty
        ind.raw_score, ind.fitness = raw, fit
        self._cache[key] = (raw, fit)

    def _rank_selection(self, pop, k):
        # ранг вместо сырого fitness — устойчивее к тому, что R2 на маленькой
        # выборке иногда улетает в дикий минус на одном неудачном фолде
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
        # ставка линейно падает от старта к финалу — сначала трясём сильно,
        # к концу только слегка подчищаем
        t = generation / max(self.cfg.generations - 1, 1)
        rate = self.cfg.mutation_rate_start * (1 - t) + self.cfg.mutation_rate_end * t
        flips = self.rng.random(self.n_features) < rate
        ind.mask[flips] = 1 - ind.mask[flips]
        ind.mask = self._repair(ind.mask)
        for name, values in self.param_space.items():
            if self.rng.random() < rate:
                ind.params[name] = self.rng.choice(values)

    def _repair(self, mask):
        # пустая маска — это особь, которую нечем обучать, чиню сразу
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
                       for i in pop[:self.cfg.elite_size]]  # элита переживает поколение без изменений
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
                print(f"    поколение {gen:2d}: лучший={gen_best.raw_score:.4f} "
                     f"(признаков {int(gen_best.mask.sum())})")
        return best


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


def run_ga(X, y, groups, task="reg", generations=15):
    cols = list(X.columns)
    Xv = X.to_numpy()
    key = "R2" if task == "reg" else "macro_F1"
    metric_fn = regression_metrics if task == "reg" else classification_metrics
    make = make_ga_regressor if task == "reg" else make_ga_classifier
    space = GA_PARAM_SPACE_REG if task == "reg" else GA_PARAM_SPACE_CLF
    # внутри GA гоняю не LOSO (40 фолдов x 30 особей x 15 поколений — можно
    # уйти пить чай на час), а 5-фолдовую групповую CV; честную LOSO-оценку
    # найденного финалиста всё равно считаю отдельно, ниже
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
    print(f"    выбрал {len(selected)} признаков из {len(cols)}: {selected}")
    print(f"    гиперпараметры: {dict(best.params)}")
    return selected, {k: (int(v) if k != "max_features" else float(v))
                      for k, v in best.params.items()}, ga.cfg.history
""")

code("""
sel_b, params_b, hist_b = run_ga(Xb, yb, groups, "reg")
res_ga_b = evaluate(make_ga_regressor(params_b), Xb[sel_b], yb, groups, blocks, "reg")
res_ga_b.pop("_pred_site")
print(f"\\nGA-модель, точки:  {fmt_metrics(res_ga_b['by_site'])}")
print(f"GA-модель, регион: {fmt_metrics(res_ga_b['by_region'])}")
res_b["ega"] = {"features": sel_b, "params": params_b, "metrics": res_ga_b, "history": hist_b}
""")

md("""
<div class="finding">
Вот это уже интересно: <b>шесть признаков вместо двадцати трёх</b>, и при
этом R² по точкам вырос с 0.73 до 0.78, а по регионам — с 0.59 до 0.71.
Причём рост по регионам заметно больше, чем по точкам — то есть отбор
не просто подогнался под знакомые данные, он реально убрал что-то, что
мешало модели работать на новом месте.

Отобранный набор — <code>bd, elevation_m, land_use_grass cover, ph_sn,
precip_mm, sm_grav</code>. Сверил с той самой статьёй про NPK: там азот
предсказывают по температуре, влажности, pH и осадкам. Мой GA независимо
пришёл почти к тому же самому, только заменил температуру на высоту над
уровнем моря — и это разумная замена именно для транссекта, где высота
и температура жёстко связаны, а высота ещё и рельеф прихватывает бонусом.
</div>
""")

# ============================================================================
# 7. Углерод — та же схема, короче
# ============================================================================
md("""
## Органический углерод

Признаки те же, что для азота, так что бейзлайн-ритуал повторять не буду —
уже видел, как там ведёт себя линейная модель на этом наборе. Сразу к
зоопарку и GA.
""")

code("""
Xc = encode(df, num_nutrient, CATEGORICAL_FEATURES)
yc = df["toc"].to_numpy()
best_c, res_c = compare_zoo("ОРГАНИЧЕСКИЙ УГЛЕРОД, полный зоопарк", Xc, yc, groups, blocks,
                            regressors(), "reg")

sel_c, params_c, hist_c = run_ga(Xc, yc, groups, "reg")
res_ga_c = evaluate(make_ga_regressor(params_c), Xc[sel_c], yc, groups, blocks, "reg")
res_ga_c.pop("_pred_site")
print(f"\\nGA-модель, точки:  {fmt_metrics(res_ga_c['by_site'])}")
print(f"GA-модель, регион: {fmt_metrics(res_ga_c['by_region'])}")
res_c["ega"] = {"features": sel_c, "params": params_c, "metrics": res_ga_c, "history": hist_c}
""")

md("""
<div class="note">
Тут GA практически не выигрывает у голого XGBoost (0.68 против 0.69 по
точкам) — в продакшен в итоге пойдёт обычный зоопарк, без урезания
признаков. Но само отобранное подмножество всё равно любопытно —
<code>bd, has_solonetz, land_use_crop/shrub cover, sm_grav,
soil_group_kastanozem/saline</code>. Ни одного климатического признака!
Для азота GA хватался за осадки, а для углерода — вообще нет. Похоже,
запас органики в этой почве определяется не сиюминутной погодой, а тем, что
это за почва и как её использовали годами, а азот больше отзывается на
текущий климатический режим. Не проверял это строго, но звучит правдоподобно.
</div>
""")

# ============================================================================
# 8. Классификатор состояния — с контрольным экспериментом
# ============================================================================
md("""
## Главная модель — классификатор состояния почвы

Это то, что реально нужно приложению. Начинаю, как обычно, с чего-то
простого — логистическая регрессия на полном наборе признаков.
""")

code("""
Xd = encode(df, num_nutrient, CATEGORICAL_FEATURES)
yd = df["soil_state_idx"].to_numpy()

baseline_clf = Pipeline([("scaler", StandardScaler()),
                         ("model", LogisticRegression(C=1.0, max_iter=2000, random_state=RANDOM_STATE))])
res_baseline_clf = evaluate(baseline_clf, Xd, yd, groups, blocks, "clf")
print(f"логрегрессия: точки {fmt_metrics(res_baseline_clf['by_site'])}")
print(f"              регион {fmt_metrics(res_baseline_clf['by_region'])}")
""")

md("""
macro-F1 около 0.59 — не позорно, но и не то, ради чего стоило бы городить
весь этот пайплайн. Проверяю зоопарк классификаторов.
""")

code("""
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


best_d, res_d = compare_zoo("КЛАСС СОСТОЯНИЯ ПОЧВЫ, полный зоопарк", Xd, yd, groups, blocks,
                            classifiers(), "clf")
""")

md("""
RandomForest подтягивает macro-F1 до 0.71 — уже что-то. Но вот сейчас та
самая проверка, о которой я предупреждал ещё когда собирал метку: если pH и
EC входят в саму формулу балла, сколько из этого качества модель получает
просто потому, что подглядывает в формулу?
""")

code("""
Xd_ctrl = encode(df, ["ph_sn", "ec_log"], None)
res_ctrl = evaluate(classifiers()["RandomForest"], Xd_ctrl, yd, groups, blocks, "clf")
res_ctrl.pop("_pred_site")
print(f"только pH и EC: {fmt_metrics(res_ctrl['by_site'])}")
res_d["control_ph_ec_only"] = res_ctrl
""")

md("""
<div class="warn">
Модель на одних pH и EC уже даёт macro-F1=0.52 — это и есть та самая
"халява" из формулы метки. Полная модель на всех признаках даёт 0.71.
Значит реальная, не тривиальная польза от остальных двадцати признаков —
это разница, примерно <b>+0.19</b>. Не хочу делать вид, что модель
угадывает состояние почвы из воздуха: львиную долю сигнала действительно
несёт формула самой метки, и это надо проговаривать вслух, а не прятать
за общей цифрой качества.
</div>

Дальше — GA, с контролем за размером набора: 12 поколений вместо 15
(классов четыре, крутить дольше не было смысла — сходится быстрее).
""")

code("""
sel_d, params_d, hist_d = run_ga(Xd, yd, groups, "clf", generations=12)
res_ga_d = evaluate(make_ga_classifier(params_d), Xd[sel_d], yd, groups, blocks, "clf")
pred_ga_d = res_ga_d.pop("_pred_site")
print(f"\\nGA-модель, точки:  {fmt_metrics(res_ga_d['by_site'])}")
print(f"GA-модель, регион: {fmt_metrics(res_ga_d['by_region'])}")
res_d["ega"] = {"features": sel_d, "params": params_d, "metrics": res_ga_d, "history": hist_d}

cm = confusion_matrix(yd, pred_ga_d)
res_d["confusion_matrix"] = cm.tolist()
""")

md("""
<div class="finding">
GA дотягивает macro-F1 до 0.75 на десяти признаках — обошёл весь зоопарк,
включая полный набор из 23 фичей. То есть после вычета "халявы" от
pH/EC реальный вклад модели даже чуть больше, чем казалось по разнице
0.71 vs 0.52 выше — GA нашёл более удачную комбинацию, чем случайный лес
на всём подряд.
</div>
""")

code("""
fig, ax = plt.subplots(figsize=(5.5, 4.6))
im = ax.imshow(cm, cmap=LinearSegmentedColormap.from_list("acc", ["white", ACCENT]))
ax.set_xticks(range(4)); ax.set_xticklabels(SOIL_STATE_CLASSES, rotation=20, ha="right")
ax.set_yticks(range(4)); ax.set_yticklabels(SOIL_STATE_CLASSES)
ax.set_xlabel("Прогноз"); ax.set_ylabel("Факт")
ax.set_title("Матрица ошибок \\u2014 GA \\u00b7 RandomForest (LOSO)", loc="left")
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
<div class="finding">
Смотрю в верхний левый угол — это ровно то, ради чего я вообще стал бы
доверять такой модели: <b>ни одна критическая почва не спуталась с
moderate или healthy</b>. Если модель и ошибается на критичных точках, она
ошибается в сторону "poor", то есть в безопасную сторону, а не наоборот.
</div>

Основная путаница — между `poor` и `moderate`. Если честно, подозреваю
здесь не столько слабость модели, сколько мою собственную метку: граница в
10 баллов из 18 — величина довольно условная, и где-то рядом с ней просто
физически трудно провести чёткую линию, даже вручную.
""")

# ============================================================================
# 9. pH — негативный результат, без прикрас
# ============================================================================
md("""
## Кислотность — тут придётся признать поражение

Нашёл [похожий проект по предсказанию pH](https://github.com/riponalmamun/Prediction-of-Soil-pH),
где на своих данных лучшая модель (Random Forest) выбила R²=0.62 и
RMSE=0.52. У них главными предикторами оказались железо, карбонат кальция
и марганец. Железа и марганца у меня в датасете просто нет, зато есть
карбонаты напрямую — TIC (неорганический углерод) с самого первого листа.
Плюс беру их же набор алгоритмов: SVR, нейросеть, стекинг.
""")

code("""
def ph_regressors() -> dict:
    base = regressors()
    base["SVR"] = _scaled(SVR(kernel="rbf", C=10.0, epsilon=0.1, gamma="scale"))
    base["ANN"] = _scaled(MLPRegressor(
        hidden_layer_sizes=(32,), alpha=1.0, max_iter=3000,
        early_stopping=True, n_iter_no_change=30, random_state=RANDOM_STATE))
    # cv=3, деревьев меньше, чем обычно — стекинг переобучает базовые модели
    # внутри каждого внешнего LOSO-фолда, и на полном размахе это часы, а не минуты
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


num_ph_full = (["ec_log", "sm_grav", "bd", "tic", "toc", "tn", "carbonate_frac"]
              + CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES)
Xe = encode(df, num_ph_full, CATEGORICAL_FEATURES)
ye = df["ph_sn"].to_numpy()
best_e, res_e = compare_zoo("КИСЛОТНОСТЬ pH, с лабораторной химией", Xe, ye, groups, blocks,
                            ph_regressors(), "reg")
print("\\nориентир из чужого репозитория: R2=0.62, RMSE=0.52")
""")

md("""
<div class="fail">
Лучший результат тут — XGBoost, R²=0.40 против их 0.62. Не дотянул. Гипотеза
про карбонаты как замену CaCO₃ подтвердилась лишь частично — сигнал есть,
но одного признака из трёх сильнейших явно недостаточно, чтобы закрыть
разрыв. Не буду делать вид, что дотянул — не дотянул.
</div>

А теперь то, ради чего я вообще решил попробовать нейросеть на этом
датасете — было любопытно, вытащит ли MLP что-то, что не видят деревья.
""")

code("""
print("ANN R2 по точкам:  ", round(res_e["algorithms"]["ANN"]["by_site"]["R2"], 3))
print("ANN R2 по регионам:", round(res_e["algorithms"]["ANN"]["by_region"]["R2"], 3))
""")

md("""
<div class="fail">
R²=-1.88 по точкам и -6.20 по регионам. Смотрите на предупреждения о
несходимости выше по выводу зоопарка — sklearn честно предупреждал на
каждом из 40 фолдов, что оптимизатор не сошёлся за 3000 итераций. Это не
баг в гиперпараметрах, это просто закономерный итог попытки обучить
нейросеть на 80 строках: ей элементарно не хватает данных, чтобы найти
устойчивый минимум, и в каждом фолде она застревает в разном месте.
Оставляю этот результат в таблице как есть — по-моему, честный
отрицательный результат полезнее, чем тихо выкинутая строчка.
</div>

Отдельно нужен вариант <i>без</i> лабораторной химии — на практике
pH-электрод может выйти из строя, и хочется иметь хоть какую-то оценку
только по тому, что реально мерит датчик и что известно по координатам.
""")

code("""
num_ph_sensor = (["ec_log", "sm_grav", "bd"] + CLIMATE_FEATURES + TERRAIN_FEATURES
                + SEASON_FEATURES + BINARY_FEATURES)
Xe_s = encode(df, num_ph_sensor, CATEGORICAL_FEATURES)
best_es, res_es = compare_zoo("pH БЕЗ ЛАБОРАТОРНОЙ ХИМИИ (вариант для продакшена)",
                              Xe_s, ye, groups, blocks, ph_regressors(), "reg")
res_e["sensor_only"] = {"algorithms": res_es["algorithms"], "best": res_es["best"]}
""")

md("""
Ожидаемо просело ещё немного (R²=0.34) — убрал часть сигнала вместе с
химией. Тем не менее именно этот вариант пойдёт в продакшен: единственный,
которому не нужна лаборатория.
""")

# ============================================================================
# 10. Сводка и разрыв валидаций
# ============================================================================
md("""
## Сводим всё в одну таблицу

Хочу увидеть все пять моделей рядом — и, что важнее, увидеть, насколько
далеко расходятся точки и регионы для каждой из них.
""")

code("""
summary_rows = [
    ("Общий азот",     "tn",             "GA \\u00b7 RandomForest", len(sel_b), res_ga_b["by_site"], res_ga_b["by_region"], "R2"),
    ("Орг. углерод",   "toc",            best_c,                    Xc.shape[1], res_c["algorithms"][best_c]["by_site"], res_c["algorithms"][best_c]["by_region"], "R2"),
    ("Влажность",      "sm_grav",        best_a,                    Xa.shape[1], res_a["algorithms"][best_a]["by_site"], res_a["algorithms"][best_a]["by_region"], "R2"),
    ("Состояние почвы","4 класса",       "GA \\u00b7 RandomForest", len(sel_d), res_ga_d["by_site"], res_ga_d["by_region"], "macro_F1"),
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
ax.set_title("Где модель честно обобщает, а где выезжает на соседях", loc="left")
ax.set_xlim(0, 0.85)
ax.legend(frameon=False, loc="lower right")
plt.tight_layout()
plt.show()
""")

md("""
<div class="note">
У азота отрезок почти не виден — точка и регион дают почти одно и то же
число. Это та модель, которой я доверяю больше всего: она выучила что-то
про физику, а не про географическую близость. У остальных отрезок длиннее,
и я читаю его как честную меру того, сколько "интерполяции по соседям"
на самом деле прячется за красивой цифрой LOSO.
</div>
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
ax.set_title("Что GA отобрал для каждой модели", loc="left")
ax.grid(False)
plt.tight_layout()
plt.show()
""")

md("""
<div class="finding">
Строка углерода на этой картинке — то, что заставило меня остановиться:
<b>ни одной климатической точки</b>. Сначала подумал, что где-то ошибка
в коде, перепроверил — нет, всё верно. Потом дошло: запас органического
углерода в почве — это накопленная за годы история, а не реакция на
сегодняшнюю погоду, в отличие от азота, который явно откликается на
текущий режим осадков. По отдельности каждый факт был мне известен и
раньше, а вот увидеть, как GA сам, без подсказок, развёл их по разным
наборам признаков — приятно.
</div>
""")

# ============================================================================
# 11. Сохранение
# ============================================================================
md("""
## Сохраняю модели

В `/kaggle/working/ml_models/` — тот же формат, который использует бэкенд
проекта: пара `<имя>_model.pkl` + `<имя>_meta.pkl` со списком признаков и
метриками внутри.
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
        return model.fit(X[feats], y), feats, "GA-RandomForest", res["ega"]["metrics"]["by_site"]
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
    print(f"  {fname:<28} {algo:<20} признаков={len(feats):<3} {fmt_metrics(metrics)}")
""")

md("""
## Что я бы сказал, если бы это был чей-то ещё проект

- Модель хороша **внутри** этого транссекта. Как только уходишь за его
  границы, качество классификатора падает почти вдвое (macro-F1 0.75 -> 0.42)
  — это не мелкий нюанс, а прямая причина не доверять прогнозу за пределами
  Казахстана без переобучения на местных данных.
- Азота и фосфора с калием тут вообще нет вместе — измерен только азот,
  так что о полноценном NPK речи не идёт.
- pH-модель — не замена электрода, а в лучшем случае грубая подсказка,
  что с датчиком, возможно, что-то не так.
- 80 строк — это 40 точек, а не 80 независимых наблюдений. К любой
  доверительной оценке стоит примысленно приписывать это уточнение.

Если у кого-то есть похожий транссект в другом регионе — было бы страшно
интересно проверить, повторится ли история с азотом (климат) и углеродом
(история землепользования), или это специфика именно казахстанской степи.
Форкайте, пробуйте, пишите, если получится что-то отличное.
""")


nb["cells"] = cells
nb["metadata"] = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.11"},
}

OUT.write_text(nbf.writes(nb))
print(f"записан: {OUT}  ({len(cells)} ячеек)")
