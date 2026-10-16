"""Self-check реестра датчиков и вебхука хаба: python test_sensors.py (на временной SQLite, рабочую базу не трогает)."""
import os, sys, tempfile
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/t.db"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.core.db import create_tables
from app.api import readings, sensors

app = FastAPI(); app.include_router(readings.router); app.include_router(sensors.router)
create_tables(); c = TestClient(app)

s = c.post("/api/sensors", json={"name": "A", "field_id": "f-1"}).json()
assert s["id"] == "SL-0001" and s["last_reading"] is None, s
assert c.post("/api/sensors", json={"name": "B", "field_id": "f-1"}).json()["id"] == "SL-0002"

pkt = lambda: {"dev_eui": "24E124AABBCC0001", "time": "2026-10-16T10:00:00+00:00", "is_valid": True,
               "decoded_data": {"ph": 7.1, "temperature_c": 9.5, "moisture_pct": 27.3, "ec_us_cm": 640}}
# до регистрации DevEUI — пакет пишется под DevEUI
assert c.post("/api/readings/linkedge", json=pkt()).json()["stored"]
# прописали DevEUI в другом формате — сирота привязалась
r = c.patch("/api/sensors/SL-0001", json={"dev_eui": "24:E1:24:AA:BB:CC:00:01"}).json()
assert r["dev_eui"] == "24e124aabbcc0001" and r["readings_count"] == 1, r
# новый пакет — сразу под кодом датчика и его полем
assert c.post("/api/readings/linkedge", json=pkt()).json()["stored"]
r = c.get("/api/sensors/SL-0001").json()
assert r["readings_count"] == 2 and r["last_reading"]["field_id"] == "f-1" and abs(r["last_reading"]["electrical_conductivity"] - 0.64) < 1e-9, r
assert c.patch("/api/sensors/SL-0002", json={"dev_eui": "24e124aabbcc0001"}).status_code == 409
assert len(c.get("/api/sensors/SL-0001/readings?hours=100000").json()) == 2
assert len(c.get("/api/sensors?field_id=f-1").json()) == 2
# время с Z и наносекундами (Python 3.10 fromisoformat на этом падает), канал pH отсутствует
p = pkt(); p["time"] = "2026-10-16T11:00:00.123456789Z"; del p["decoded_data"]["ph"]
assert c.post("/api/readings/linkedge", json=p).json()["stored"]
r = c.get("/api/sensors/SL-0001").json()["last_reading"]
assert r["timestamp"].startswith("2026-10-16T11:00:00") and r["timestamp"].endswith(("Z", "+00:00")) and r["ph"] is None, r
assert c.delete("/api/sensors/SL-0002").json()["deleted"] and c.get("/api/sensors/SL-0002").status_code == 404
print("ok")
