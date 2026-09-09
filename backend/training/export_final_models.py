import json
import sys
from pathlib import Path
import joblib

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (BINARY_FEATURES, CATEGORICAL_FEATURES, CLIMATE_FEATURES,
                    MODELS_DIR, REPORTS_DIR, SEASON_FEATURES, SENSOR_FEATURES,
                    SOIL_STATE_CLASSES, TERRAIN_FEATURES, add_soil_state_label,
                    encode, fmt_metrics, load_dataset)
from models import (GA_PARAM_SPACE_CLF, GA_PARAM_SPACE_REG, classifiers,
                    make_ga_classifier, make_ga_regressor, ph_regressors,
                    regressors)

def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / "training_report.json"
    if not report_file.exists():
        raise FileNotFoundError(f"{report_file} not found")

    report = json.loads(report_file.read_text(encoding="utf-8"))

    df = add_soil_state_label(load_dataset())

    # Features setup exactly matching train_all.py
    num_a = (CLIMATE_FEATURES + TERRAIN_FEATURES + SEASON_FEATURES
             + BINARY_FEATURES + ["bd", "ph_sn", "ec_log"])
    Xa = encode(df, num_a, CATEGORICAL_FEATURES)
    ya = df["sm_grav"].to_numpy()

    num_b = (SENSOR_FEATURES + CLIMATE_FEATURES + TERRAIN_FEATURES
             + SEASON_FEATURES + BINARY_FEATURES)
    Xb = encode(df, num_b, CATEGORICAL_FEATURES)
    yb = df["tn"].to_numpy()

    num_c = num_b
    Xc = encode(df, num_c, CATEGORICAL_FEATURES)
    yc = df["toc"].to_numpy()

    num_d = num_b
    Xd = encode(df, num_d, CATEGORICAL_FEATURES)
    yd = df["soil_state_idx"].to_numpy()

    num_e_sensor = (["ec_log", "sm_grav", "bd"] + CLIMATE_FEATURES
                    + TERRAIN_FEATURES + SEASON_FEATURES + BINARY_FEATURES)
    Xe_s = encode(df, num_e_sensor, CATEGORICAL_FEATURES)
    ye = df["ph_sn"].to_numpy()

    configs = [
        ("moisture", report["moisture"], Xa, ya, "reg", "soil_moisture_model.pkl"),
        ("nitrogen", report["nitrogen"], Xb, yb, "reg", "soil_nitrogen_model.pkl"),
        ("carbon",   report["carbon"],   Xc, yc, "reg", "soil_carbon_model.pkl"),
        ("state",    report["state"],    Xd, yd, "clf", "soil_state_model.pkl"),
        ("ph",       report["ph"]["sensor_only"], Xe_s, ye, "reg", "soil_ph_model.pkl"),
    ]

    for tag, res, X, y, task, fname in configs:
        key = "R2" if task == "reg" else "macro_F1"
        zoo_best = res["algorithms"][res["best"]]["by_site"][key]
        if "ega" in res and res["ega"]["metrics"]["by_site"][key] >= zoo_best:
            feats = res["ega"]["features"]
            mk = make_ga_regressor if task == "reg" else make_ga_classifier
            model = mk(res["ega"]["params"])
            algo = "EGA-RandomForest"
            metrics = res["ega"]["metrics"]["by_site"]
            fitted = model.fit(X[feats], y)
        else:
            name = res["best"]
            if tag == "ph":
                model_map = ph_regressors()
            elif task == "reg":
                model_map = regressors()
            else:
                model_map = classifiers()
            model = model_map[name]
            feats = list(X.columns)
            algo = name
            metrics = res["algorithms"][name]["by_site"]
            fitted = model.fit(X, y)

        joblib.dump(fitted, MODELS_DIR / fname)
        meta = {
            "features": feats,
            "algorithm": algo,
            "task": task,
            "metrics_loso": metrics,
            "target": {"moisture": "sm_grav", "nitrogen": "tn",
                       "carbon": "toc", "state": "soil_state_idx",
                       "ph": "ph_sn"}[tag],
            "n_train": int(len(y)),
            "n_sites": int(df["sample_id"].nunique()),
            "dataset": "Supplement 2.xlsx (Kazakhstan transect, 2015)",
        }
        if task == "clf":
            meta["classes"] = SOIL_STATE_CLASSES
        meta_fname = fname.replace("_model.pkl", "_meta.pkl")
        joblib.dump(meta, MODELS_DIR / meta_fname)
        print(f"Exported {fname:<26} ({algo:<20}) with {len(feats)} features. Metrics: {fmt_metrics(metrics)}")

if __name__ == "__main__":
    main()
