"""
Soil Moisture Forecaster — Ridge Regression

Predicts soil moisture 6 h and 24 h ahead 
Feature set mirrors ERA5-land volumetric soil water layers + meteorological
variables available from Open-Meteo :
    lag1..lag5  – moisture readings at t-1h .. t-5h (or latest 5 readings)
    soil_temp   – current soil temperature (°C)
    humidity    – ambient relative humidity (%)
    precip_1h   – estimated precipitation in last hour (mm)
    hour_sin / hour_cos   – time-of-day cyclical encoding
    doy_sin  / doy_cos    – day-of-year cyclical encoding

Targets:
    moisture_6h  – soil moisture 6 hours from now
    moisture_24h – soil moisture 24 hours from now

Usage:
    cd backend
    python ml_models/train_moisture_forecast.py
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score

MODELS_DIR = Path(__file__).resolve().parent
RANDOM_SEED = 42
N_SERIES = 200        # number of independent time-series to simulate
SERIES_LEN = 400      # hours per series


def simulate_moisture_series(n_series: int, series_len: int, seed: int) -> pd.DataFrame:
    """
    Simulate realistic soil moisture time series.

    Physics-inspired model:
        moisture(t+1) = moisture(t)
                      - evapotranspiration(temp, humidity) * dt
                      + irrigation_or_rain(t)   (stochastic events)
                      + noise
    """
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_series):
        # Randomise series parameters
        base_temp   = rng.uniform(15, 35)
        base_humid  = rng.uniform(30, 80)
        init_moist  = rng.uniform(20, 70)

        moisture = np.zeros(series_len)
        temp     = np.zeros(series_len)
        humid    = np.zeros(series_len)
        precip   = np.zeros(series_len)
        moisture[0] = init_moist

        for t in range(1, series_len):
            hour = t % 24
            doy  = (t // 24) % 365

            # Diurnal temperature variation
            temp[t] = base_temp + 5 * np.sin(2 * np.pi * hour / 24) + rng.normal(0, 1)
            humid[t] = base_humid - 10 * np.sin(2 * np.pi * hour / 24) + rng.normal(0, 3)
            humid[t] = np.clip(humid[t], 10, 100)

            # Evapotranspiration: higher when warm & dry
            et = 0.02 * max(temp[t] - 5, 0) * (1 - humid[t] / 100) + rng.uniform(0, 0.1)

            # Stochastic rainfall / irrigation event (~8% chance per hour)
            rain = 0.0
            if rng.random() < 0.08:
                rain = rng.exponential(3.0)   # mm, roughly proportional to moisture gain
            precip[t] = rain

            moisture[t] = moisture[t - 1] - et + rain * 0.4 + rng.normal(0, 0.5)
            moisture[t] = np.clip(moisture[t], 5, 90)

        # Build lag-feature windows (need at least 5 lags)
        for t in range(5, series_len - 24):
            hour_val = t % 24
            doy_val  = (t // 24) % 365
            rows.append({
                "lag1": moisture[t - 1],
                "lag2": moisture[t - 2],
                "lag3": moisture[t - 3],
                "lag4": moisture[t - 4],
                "lag5": moisture[t - 5],
                "soil_temp": temp[t],
                "humidity": humid[t],
                "precip_1h": precip[t],
                "hour_sin": np.sin(2 * np.pi * hour_val / 24),
                "hour_cos": np.cos(2 * np.pi * hour_val / 24),
                "doy_sin":  np.sin(2 * np.pi * doy_val / 365),
                "doy_cos":  np.cos(2 * np.pi * doy_val / 365),
                "target_6h":  moisture[t + 6]  if t + 6  < series_len else np.nan,
                "target_24h": moisture[t + 24] if t + 24 < series_len else np.nan,
            })

    df = pd.DataFrame(rows).dropna()
    return df


FEATURES = [
    "lag1", "lag2", "lag3", "lag4", "lag5",
    "soil_temp", "humidity", "precip_1h",
    "hour_sin", "hour_cos", "doy_sin", "doy_cos",
]


def train_target(df: pd.DataFrame, target_col: str, label: str) -> Pipeline:
    X = df[FEATURES]
    y = df[target_col]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.15,
                                               random_state=RANDOM_SEED)
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("ridge",  Ridge(alpha=1.0)),
    ])
    pipe.fit(X_tr, y_tr)
    y_pred = pipe.predict(X_te)
    mae = mean_absolute_error(y_te, y_pred)
    r2  = r2_score(y_te, y_pred)
    print(f"  [{label}] MAE={mae:.2f}% | R²={r2:.3f}")
    return pipe


def train():
    print("Simulating soil moisture time series …")
    df = simulate_moisture_series(N_SERIES, SERIES_LEN, RANDOM_SEED)
    print(f"  Training rows: {len(df):,}")

    print("Training Ridge forecasters …")
    model_6h  = train_target(df, "target_6h",  "6h forecast ")
    model_24h = train_target(df, "target_24h", "24h forecast")

    meta = {"features": FEATURES}

    for name, model in [("soil_moisture_forecast_6h.pkl",  model_6h),
                        ("soil_moisture_forecast_24h.pkl", model_24h)]:
        path = MODELS_DIR / name
        joblib.dump(model, path)
        print(f"  Saved → {path}")

    joblib.dump(meta, MODELS_DIR / "moisture_forecast_meta.pkl")
    print(f"  Saved → {MODELS_DIR / 'moisture_forecast_meta.pkl'}")


if __name__ == "__main__":
    train()
