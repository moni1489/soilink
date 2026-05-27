from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import create_tables
from app.api import readings, fields, predictions, recommendations, chat

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


@app.on_event("startup")
def on_startup():
    create_tables()


@app.get("/")
def health():
    return {"status": "ok", "service": "soilink-backend"}
