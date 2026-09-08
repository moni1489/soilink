"""
Общие определения для обучения моделей состояния почвы.

Главное методологическое ограничение датасета: 40 точек опробования,
каждая измерена дважды (май и сентябрь 2015) => 80 наблюдений.
Май и сентябрь одной точки — почти одна и та же почва, поэтому обычный
KFold дал бы утечку (одна точка попадала бы и в train, и в test) и
завышенные метрики. Везде используется группировка по sample_id.
"""
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut, cross_val_predict

HERE = Path(__file__).resolve().parent
DATASET = HERE / "soil_dataset.csv"
MODELS_DIR = HERE.parent / "ml_models"
REPORTS_DIR = HERE / "reports"

RANDOM_STATE = 42

# --- Укрупнение категорий -------------------------------------------------
# В исходнике 9 типов почв WRB на 40 точек — слишком дробно для 80 наблюдений.
# Группируем по агрономически близким классам.
SOIL_GROUP_MAP = {
    "chernozem": "chernozem",
    "chernozem+solonetz": "chernozem",
    "kastanozem": "kastanozem",
    "arenosol": "arenosol",
    "arenosol+solonetz": "arenosol",
    "calcisol+solonetz": "saline",
    "solonchak+solonetz": "saline",
    "regosol": "other",
    "umbrisol": "other",
}


def load_dataset() -> pd.DataFrame:
    if not DATASET.exists():
        raise FileNotFoundError(
            f"{DATASET} не найден — сначала запустите build_dataset.py")
    df = pd.read_csv(DATASET)

    df["soil_group"] = df["soil_type_wrb"].map(SOIL_GROUP_MAP).fillna("other")
    # Солонцеватость — прямой признак засолённости, он размазан по названиям WRB
    df["has_solonetz"] = df["soil_type_wrb"].str.contains("solonetz").astype(int)

    # EC в исходнике от 60 до 9176 мкСм/см (солончак) — распределение
    # логнормальное, без лога модель видит одну точку-выброс.
    df["ec_log"] = np.log10(df["ec"])
    df["ec_ds_m"] = df["ec"] / 1000.0  # мкСм/см -> дСм/м, агрономическая шкала

    # Индекс аридности Де Мартонна: осадки / (t + 10).
    # Один признак вместо двух коррелированных, физически осмысленный.
    df["aridity"] = df["precip_mm"] / (df["mat_c"] + 10.0)

    # Медианная импутация единственного пропуска (EC точки 8 за сентябрь)
    for col in ["ec", "ec_log", "ec_ds_m"]:
        df[col] = df[col].fillna(df[col].median())

    return df


# --- Наборы признаков -----------------------------------------------------
# То, что реально доступно приложению в момент инференса:
# полевой датчик (pH, EC, влажность, температура) + координаты + климат.
SENSOR_FEATURES = ["ph_sn", "ec_log", "sm_grav", "bd"]
CLIMATE_FEATURES = ["precip_mm", "mat_c", "aridity"]
TERRAIN_FEATURES = ["elevation_m", "latitude", "longitude"]
SEASON_FEATURES = ["is_september", "doy"]
CATEGORICAL_FEATURES = ["land_use", "soil_group"]
BINARY_FEATURES = ["has_solonetz"]


def encode(df: pd.DataFrame, numeric: list[str],
           categorical: list[str] | None = None) -> pd.DataFrame:
    """One-hot для категорий + числовые признаки, в стабильном порядке колонок."""
    parts = [df[numeric].astype(float)]
    if categorical:
        for col in categorical:
            dummies = pd.get_dummies(df[col], prefix=col).astype(float)
            parts.append(dummies)
    out = pd.concat(parts, axis=1)
    return out.reindex(sorted(out.columns), axis=1)


# --- Кросс-валидация ------------------------------------------------------
def group_cv(n_groups: int, n_splits: int = 5):
    """GroupKFold по точкам опробования."""
    return GroupKFold(n_splits=min(n_splits, n_groups))


def loso_cv():
    """Leave-One-Site-Out: 40 фолдов. При n=80 самая устойчивая оценка."""
    return LeaveOneGroupOut()


def cv_predict(model, X, y, groups, cv=None):
    cv = cv or loso_cv()
    return cross_val_predict(model, X, y, groups=groups, cv=cv, n_jobs=-1)


def regression_metrics(y_true, y_pred) -> dict:
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "R2": float(r2_score(y_true, y_pred)),
        "RMSE": rmse,
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        # RMSE в долях стандартного отклонения: <1 значит лучше среднего
        "RMSE/SD": float(rmse / y_true.std(ddof=1)),
    }


def classification_metrics(y_true, y_pred) -> dict:
    from sklearn.metrics import (accuracy_score, balanced_accuracy_score,
                                 cohen_kappa_score, f1_score)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "macro_F1": float(f1_score(y_true, y_pred, average="macro")),
        "cohen_kappa": float(cohen_kappa_score(y_true, y_pred)),
    }


def fmt_metrics(m: dict) -> str:
    return "  ".join(f"{k}={v:.3f}" for k, v in m.items())


# --- Целевая метка состояния почвы ---------------------------------------
SOIL_STATE_CLASSES = ["critical", "poor", "moderate", "healthy"]
# Границы суммарного балла (0..18) между классами
SOIL_STATE_CUTS = (6, 10, 14)


def _score_row(r) -> int:
    """
    Агрономический балл состояния почвы, 0..18.

    Складывается из четырёх независимых измерений качества почвы.
    Органика (углерод и азот) весит вдвое: именно она определяет
    плодородие и именно её нельзя измерить дешёвым полевым датчиком.

      TOC, г/кг      — градация по классам содержания органического углерода
      TN,  г/кг      — обеспеченность общим азотом
      pH             — оптимум 6.0-7.5, штраф за отклонение в обе стороны
      EC, дСм/м      — засолённость (вытяжка 1:5)
    """
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


def add_soil_state_label(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["soil_score"] = df.apply(_score_row, axis=1)
    df["soil_state"] = pd.cut(
        df["soil_score"], [-1, *SOIL_STATE_CUTS, 999],
        labels=SOIL_STATE_CLASSES).astype(str)
    df["soil_state_idx"] = df["soil_state"].map(
        {c: i for i, c in enumerate(SOIL_STATE_CLASSES)})
    return df


def spatial_blocks(df: pd.DataFrame, n_blocks: int = 5) -> np.ndarray:
    """
    Пространственные блоки по широте.

    Точки лежат вдоль транссекта север-юг (54.9 -> 42.9 с.ш.), а климат
    меняется вдоль него монотонно. Соседние точки похожи друг на друга,
    поэтому Leave-One-Site-Out всё ещё оптимистичен: модель интерполирует
    между соседями. Блочная CV по широте отвечает на более честный вопрос —
    переносится ли модель на новый, не виденный регион.
    """
    return pd.qcut(df["latitude"], n_blocks, labels=False).to_numpy()
