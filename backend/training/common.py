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
