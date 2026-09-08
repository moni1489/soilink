"""
Обучение всех моделей состояния почвы на датасете Supplement 2.

Четыре модели:
  A. Влажность почвы (sm_grav, %)   — набор алгоритмов из репозитория-референса
  B. Общий азот (tn, г/кг)          — отбор признаков генетическим алгоритмом
  C. Органический углерод (toc, г/кг) — то же
  D. Класс состояния почвы (4 класса) — контракт бэкенда

Запуск:
    backend/.venv/bin/python backend/training/train_all.py
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import cross_val_predict

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (BINARY_FEATURES, CATEGORICAL_FEATURES, CLIMATE_FEATURES,
                    MODELS_DIR, REPORTS_DIR, SEASON_FEATURES, SENSOR_FEATURES,
                    SOIL_STATE_CLASSES, TERRAIN_FEATURES, add_soil_state_label,
                    classification_metrics, encode, fmt_metrics, load_dataset,
                    loso_cv, regression_metrics, spatial_blocks)
from ga import EGAConfig, EnhancedGA
from models import (GA_PARAM_SPACE_CLF, GA_PARAM_SPACE_REG, classifiers,
                    make_ga_classifier, make_ga_regressor, regressors)

RESULTS: dict = {}


# ---------------------------------------------------------------------------
# Утечки: какие колонки нельзя давать модели для каждой цели.
# Все они — арифметические производные самой цели, а не независимые измерения.
# ---------------------------------------------------------------------------
LEAKAGE = {
    # sm_vol = sm_grav * bd / 100 — та же влажность в других единицах
    "sm_grav": ["sm_vol"],
    # tn_stock ~ tn * bd * глубина; cn_ratio = toc/tn; toc коррелирует с tn на 0.97
    "tn": ["tn_stock_t_ha", "cn_ratio", "toc", "tc", "tic", "loi",
           "toc_stock_t_ha", "carbonate_frac"],
    # tc = toc + tic, поэтому и tc, и tic производны от цели; loi ~ органика
    "toc": ["toc_stock_t_ha", "cn_ratio", "tn", "tc", "tic", "loi",
            "tn_stock_t_ha", "carbonate_frac"],
    # метка состояния строится из toc/tn/ph/ec — лабораторную часть убираем
    "soil_state_idx": ["toc", "tn", "tc", "tic", "loi", "cn_ratio",
                       "toc_stock_t_ha", "tn_stock_t_ha", "carbonate_frac",
                       "soil_score", "soil_state", "sm_vol"],
}


def evaluate(model, X, y, groups, blocks, task="reg") -> dict:
    """Две схемы валидации: по точкам и по пространственным блокам."""
    metric_fn = regression_metrics if task == "reg" else classification_metrics
    out = {}

    pred_site = cross_val_predict(model, X, y, groups=groups, cv=loso_cv(), n_jobs=-1)
    out["by_site"] = metric_fn(y, pred_site)

    from sklearn.model_selection import GroupKFold
    pred_block = cross_val_predict(
        model, X, y, groups=blocks, cv=GroupKFold(n_splits=len(np.unique(blocks))),
        n_jobs=-1)
    out["by_region"] = metric_fn(y, pred_block)
    out["_pred_site"] = pred_site
    return out


def compare_zoo(name, X, y, groups, blocks, zoo, task="reg") -> tuple[str, dict]:
    print(f"\n{'='*78}\n{name}\n{'='*78}")
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
    print(f"\n  -> лучший: {best} ({key}={rows[best]['by_site'][key]:.3f})")
    return best, {"algorithms": rows, "best": best, "predictions": preds}


# ---------------------------------------------------------------------------
def run_ga(X, y, groups, task="reg", generations=15):
    """Отбор признаков + гиперпараметров генетическим алгоритмом."""
    cols = list(X.columns)
    Xv = X.to_numpy()
    key = "R2" if task == "reg" else "macro_F1"
    metric_fn = regression_metrics if task == "reg" else classification_metrics
    make = make_ga_regressor if task == "reg" else make_ga_classifier
    space = GA_PARAM_SPACE_REG if task == "reg" else GA_PARAM_SPACE_CLF

    # Внутри GA используем 8-фолдовую групповую CV, а не LOSO:
    # LOSO на каждой особи из 30x15 оценок был бы неоправданно дорог,
    # а финальную честную оценку лучшей особи всё равно считаем по LOSO.
    from sklearn.model_selection import GroupKFold
    inner = GroupKFold(n_splits=8)

    def score_fn(mask, params):
        try:
            pred = cross_val_predict(make(params), Xv[:, mask], y,
                                     groups=groups, cv=inner, n_jobs=-1)
            return metric_fn(y, pred)[key]
        except Exception:
            return -1.0

    ga = EnhancedGA(len(cols), space, score_fn,
                    EGAConfig(generations=generations, random_state=42))
    best = ga.run()
    selected = [c for c, m in zip(cols, best.mask) if m]
    print(f"    отобрано признаков: {len(selected)} из {len(cols)}")
    print(f"    {selected}")
    print(f"    гиперпараметры: {dict(best.params)}")
    return selected, {k: (int(v) if k != 'max_features' else float(v))
                      for k, v in best.params.items()}, ga.cfg.history


# ---------------------------------------------------------------------------
def main() -> None:
    MODELS_DIR.mkdir(exist_ok=True)
    REPORTS_DIR.mkdir(exist_ok=True)

    df = add_soil_state_label(load_dataset())
    groups = df["sample_id"].to_numpy()
    blocks = spatial_blocks(df)
    print(f"Датасет: {len(df)} наблюдений, {df['sample_id'].nunique()} точек, "
          f"{len(np.unique(blocks))} пространственных блоков")

    # ---------------- A. Влажность почвы --------------------------------
    # Влажность предсказывается по климату, рельефу, типу почвы и сезону —
    # то есть по тому, что известно без датчика влаги.
    num_a = (CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES
             + BINARY_FEATURES + ["bd", "ph_sn", "ec_log"])
    Xa = encode(df, num_a, CATEGORICAL_FEATURES)
    ya = df["sm_grav"].to_numpy()
    best_a, res_a = compare_zoo("A. ВЛАЖНОСТЬ ПОЧВЫ (гравиметрическая, %)",
                                Xa, ya, groups, blocks, regressors(), "reg")

    # ---------------- B. Общий азот -------------------------------------
    # Референсная статья предсказывает NPK по температуре, влажности,
    # pH и осадкам. Здесь тот же набор + рельеф/тип почвы/сезон.
    num_b = (SENSOR_FEATURES + CLIMATE_FEATURES + TERRAIN_FEATURES
             + SEASON_FEATURES + BINARY_FEATURES)
    Xb = encode(df, num_b, CATEGORICAL_FEATURES)
    yb = df["tn"].to_numpy()
    best_b, res_b = compare_zoo("B. ОБЩИЙ АЗОТ (г/кг)", Xb, yb, groups, blocks,
                                regressors(), "reg")

    print("\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
    sel_b, params_b, hist_b = run_ga(Xb, yb, groups, "reg")
    ga_model_b = make_ga_regressor(params_b)
    res_ga_b = evaluate(ga_model_b, Xb[sel_b], yb, groups, blocks, "reg")
    res_ga_b.pop("_pred_site")
    print(f"    EGA по точкам:   {fmt_metrics(res_ga_b['by_site'])}")
    print(f"    EGA по регионам: {fmt_metrics(res_ga_b['by_region'])}")
    res_b["ega"] = {"features": sel_b, "params": params_b,
                    "metrics": res_ga_b, "history": hist_b}

    # ---------------- C. Органический углерод ---------------------------
    num_c = num_b
    Xc = encode(df, num_c, CATEGORICAL_FEATURES)
    yc = df["toc"].to_numpy()
    best_c, res_c = compare_zoo("C. ОРГАНИЧЕСКИЙ УГЛЕРОД (г/кг)", Xc, yc,
                                groups, blocks, regressors(), "reg")
    print("\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
    sel_c, params_c, hist_c = run_ga(Xc, yc, groups, "reg")
    ga_model_c = make_ga_regressor(params_c)
    res_ga_c = evaluate(ga_model_c, Xc[sel_c], yc, groups, blocks, "reg")
    res_ga_c.pop("_pred_site")
    print(f"    EGA по точкам:   {fmt_metrics(res_ga_c['by_site'])}")
    print(f"    EGA по регионам: {fmt_metrics(res_ga_c['by_region'])}")
    res_c["ega"] = {"features": sel_c, "params": params_c,
                    "metrics": res_ga_c, "history": hist_c}

    # ---------------- D. Класс состояния почвы --------------------------
    num_d = (SENSOR_FEATURES + CLIMATE_FEATURES + TERRAIN_FEATURES
             + SEASON_FEATURES + BINARY_FEATURES)
    Xd = encode(df, num_d, CATEGORICAL_FEATURES)
    yd = df["soil_state_idx"].to_numpy()
    best_d, res_d = compare_zoo("D. КЛАСС СОСТОЯНИЯ ПОЧВЫ (4 класса)",
                                Xd, yd, groups, blocks, classifiers(), "clf")

    # Контрольный эксперимент: pH и EC входят в формулу метки, значит их
    # вклад модель обязана выучить тривиально. Отдельно считаем, сколько
    # даёт модель только на них — разница и есть реальная польза модели.
    print("\n  --- контроль: только pH и EC (они входят в формулу метки) ---")
    Xd_ctrl = encode(df, ["ph_sn", "ec_log"], None)
    from models import classifiers as _clf
    ctrl = _clf()["RandomForest"]
    res_ctrl = evaluate(ctrl, Xd_ctrl, yd, groups, blocks, "clf")
    res_ctrl.pop("_pred_site")
    print(f"    контроль по точкам: {fmt_metrics(res_ctrl['by_site'])}")
    res_d["control_ph_ec_only"] = res_ctrl

    print("\n  --- отбор признаков генетическим алгоритмом (EGA) ---")
    sel_d, params_d, hist_d = run_ga(Xd, yd, groups, "clf", generations=12)
    ga_model_d = make_ga_classifier(params_d)
    res_ga_d = evaluate(ga_model_d, Xd[sel_d], yd, groups, blocks, "clf")
    pred_ga_d = res_ga_d.pop("_pred_site")
    print(f"    EGA по точкам:   {fmt_metrics(res_ga_d['by_site'])}")
    print(f"    EGA по регионам: {fmt_metrics(res_ga_d['by_region'])}")
    res_d["ega"] = {"features": sel_d, "params": params_d,
                    "metrics": res_ga_d, "history": hist_d}

    cm = confusion_matrix(yd, pred_ga_d)
    print("\n  Матрица ошибок EGA-модели (строки — факт, столбцы — прогноз):")
    print("      " + "".join(f"{c[:9]:>10}" for c in SOIL_STATE_CLASSES))
    for i, c in enumerate(SOIL_STATE_CLASSES):
        print(f"  {c[:9]:<10}" + "".join(f"{v:>10}" for v in cm[i]))
    res_d["confusion_matrix"] = cm.tolist()

    # ---------------- Сохранение артефактов -----------------------------
    print(f"\n{'='*78}\nСОХРАНЕНИЕ АРТЕФАКТОВ -> {MODELS_DIR}\n{'='*78}")

    def pick(res, X, y, task, forced=None):
        """Берём EGA-вариант, если он не хуже лучшего из зоопарка."""
        key = "R2" if task == "reg" else "macro_F1"
        zoo_best = res["algorithms"][res["best"]]["by_site"][key]
        if "ega" in res and res["ega"]["metrics"]["by_site"][key] >= zoo_best:
            feats = res["ega"]["features"]
            mk = make_ga_regressor if task == "reg" else make_ga_classifier
            model = mk(res["ega"]["params"])
            return model.fit(X[feats], y), feats, "EGA-RandomForest", \
                res["ega"]["metrics"]["by_site"]
        name = forced or res["best"]
        model = (regressors() if task == "reg" else classifiers())[name]
        return model.fit(X, y), list(X.columns), name, \
            res["algorithms"][name]["by_site"]

    artifacts = {}
    for tag, res, X, y, task, fname in [
        ("moisture", res_a, Xa, ya, "reg", "soil_moisture_model.pkl"),
        ("nitrogen", res_b, Xb, yb, "reg", "soil_nitrogen_model.pkl"),
        ("carbon",   res_c, Xc, yc, "reg", "soil_carbon_model.pkl"),
        ("state",    res_d, Xd, yd, "clf", "soil_state_model.pkl"),
    ]:
        model, feats, algo, metrics = pick(res, X, y, task)
        joblib.dump(model, MODELS_DIR / fname)
        meta = {
            "features": feats,
            "algorithm": algo,
            "task": task,
            "metrics_loso": metrics,
            "target": {"moisture": "sm_grav", "nitrogen": "tn",
                       "carbon": "toc", "state": "soil_state_idx"}[tag],
            "n_train": int(len(y)),
            "n_sites": int(df["sample_id"].nunique()),
            "dataset": "Supplement 2.xlsx (Kazakhstan transect, 2015)",
        }
        if task == "clf":
            meta["classes"] = SOIL_STATE_CLASSES
        joblib.dump(meta, MODELS_DIR / fname.replace("_model.pkl", "_meta.pkl"))
        artifacts[tag] = {"file": fname, "algorithm": algo,
                          "n_features": len(feats), "metrics": metrics}
        print(f"  {fname:<28} {algo:<22} признаков={len(feats):<3} "
              f"{fmt_metrics(metrics)}")

    RESULTS.update({
        "dataset": {"n_obs": len(df), "n_sites": int(df["sample_id"].nunique()),
                    "seasons": ["may", "sep"], "source": "Supplement 2.xlsx"},
        "moisture": _clean(res_a), "nitrogen": _clean(res_b),
        "carbon": _clean(res_c), "state": _clean(res_d),
        "artifacts": artifacts,
        "class_distribution": df["soil_state"].value_counts().to_dict(),
    })
    out = REPORTS_DIR / "training_report.json"
    out.write_text(json.dumps(RESULTS, indent=2, ensure_ascii=False, default=str))
    print(f"\nОтчёт: {out}")


def _clean(res: dict) -> dict:
    """Убираем массивы прогнозов перед сериализацией в JSON."""
    r = {k: v for k, v in res.items() if k != "predictions"}
    return r


if __name__ == "__main__":
    main()
