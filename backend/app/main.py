import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.db import create_tables
from app.core.config import settings
from app.api import readings, fields, predictions, recommendations, chat, sensors, auth
from app.core.security import require_session

app = FastAPI(title="SoiLink Backend", version="0.1.0")

# Весь /api — только после входа (кроме самого входа и вебхука хаба)
app.middleware("http")(require_session)

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
app.include_router(sensors.router)
app.include_router(auth.router)


@app.on_event("startup")
def on_startup():
    create_tables()
    auth.bootstrap_admin()


@app.get("/health")
def health():
    return {"status": "ok", "service": "soilink-backend"}


@app.get("/api/config")
def get_public_config():
    return {
        "mapbox_token": settings.MAPBOX_TOKEN or os.getenv("MAPBOX_TOKEN") or os.getenv("VITE_MAPBOX_TOKEN") or ""
    }

# Mount the static directory
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")

if os.path.exists(static_dir):
    # Serve assets directory directly
    assets_dir = os.path.join(static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Catch-all route to serve index.html for SPA routing
    @app.get("/{full_path:path}")
    def serve_react_app(full_path: str):
        return FileResponse(os.path.join(static_dir, "index.html"))
