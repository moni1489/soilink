from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import create_tables, SessionLocal
from app.api import readings, fields, predictions, recommendations, chat, demo

app = FastAPI(title="SoiLink Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(readings.router)
app.include_router(fields.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(chat.router)
app.include_router(demo.router)


@app.on_event("startup")
def on_startup():
    create_tables()
    _seed_demo_data()


def _seed_demo_data():
    from app.services.random_data_service import seed_random_scenario
    db = SessionLocal()
    try:
        seed_random_scenario(db, field_id="demo-field-1", n_sensors=3, readings_per_sensor=5, language="en")
        seed_random_scenario(db, field_id="demo-field-2", n_sensors=2, readings_per_sensor=4, language="en")
    except Exception as exc:
        print(f"[demo seed] warning: {exc}")
    finally:
        db.close()


@app.get("/")
def health():
    return {"status": "ok", "service": "soilink-backend"}
