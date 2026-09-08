"""
Климатические нормы ERA5 для 40 точек опробования.

Зачем: в Supplement 2 колонки «Mean total precipitation» и «Mean annual
temperature» заданы поблочно (несколько соседних точек делят одно значение)
и взяты из источника, который в проде недоступен. Если обучить модель на них,
а в приложении подавать климат из Open-Meteo, признаки на входе окажутся
систематически смещёнными — для Кокшетау расхождение составляет
324 против 399 мм осадков и 1.4 против 3.4 °C.

Поэтому обучающие признаки берутся тем же сервисом и за тот же период
(норма ВМО 1991-2020), что и при инференсе.

Запуск:
    backend/.venv/bin/python backend/training/fetch_site_climate.py
"""
import sys
import time
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from app.services.climate_service import get_climate  # noqa: E402

OUT = HERE / "site_climate.csv"
MAX_RETRIES = 4


def main() -> None:
    ann = pd.read_excel(HERE / "Supplement 2.xlsx", sheet_name="Annotation (9)")
    sites = ann[["Internal sample #", "Longtitude", "Latitude "]].rename(columns={
        "Internal sample #": "sample_id",
        "Longtitude": "longitude", "Latitude ": "latitude"})

    # Выкачка возобновляемая: результат каждой точки сразу пишется на диск.
    # Один запрос — это 30 лет суточных данных (~1 МБ), все 40 точек занимают
    # около десяти минут, и обрыв на середине не должен стоить всей работы.
    done: dict[int, dict] = {}
    if OUT.exists():
        prev = pd.read_csv(OUT).to_dict("records")
        done = {int(r["sample_id"]): r for r in prev
                if not r["climate_is_fallback"]}
        if done:
            print(f"Найден незаконченный прогон: {len(done)} точек уже собрано, "
                  f"их пропускаем\n")

    rows = list(done.values())
    for _, s in sites.iterrows():
        sid = int(s.sample_id)
        if sid in done:
            continue
        for attempt in range(MAX_RETRIES):
            c = get_climate(float(s.latitude), float(s.longitude))
            if not c["is_fallback"]:
                break
            # сеть подвела — ждём с нарастающей паузой и пробуем снова
            time.sleep(2 * (attempt + 1))
        status = "ok" if not c["is_fallback"] else "ФОЛБЭК"
        print(f"  точка {int(s.sample_id):>2}: precip={c['precip_mm']:7.1f} мм  "
              f"t={c['mat_c']:6.2f} C  h={c['elevation_m']:6.1f} м  {status}",
              flush=True)
        rows.append({
            "sample_id": sid,
            "era5_precip_mm": c["precip_mm"],
            "era5_mat_c": c["mat_c"],
            "era5_elevation_m": c["elevation_m"],
            "climate_is_fallback": int(c["is_fallback"]),
        })
        # сохраняем после каждой точки, а не в конце
        pd.DataFrame(rows).sort_values("sample_id").to_csv(OUT, index=False)

    df = pd.DataFrame(rows).sort_values("sample_id")
    df.to_csv(OUT, index=False)
    n_bad = int(df["climate_is_fallback"].sum())
    print(f"\nСохранено: {OUT}  ({len(df)} точек, фолбэков: {n_bad})")
    if n_bad:
        print("ВНИМАНИЕ: часть точек получила климат по умолчанию — "
              "перезапустите скрипт, иначе обучение пойдёт по мусорным признакам.")
        sys.exit(1)


if __name__ == "__main__":
    main()
