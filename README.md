# SoiLink

Soil monitoring dashboard: sensor readings on a map, SoilGrids soil data layers, ML crop recommendations, and a Gemini-powered chat for agronomists.

- **Backend** — FastAPI, SQLAlchemy, PostgreSQL, XGBoost/LightGBM, Gemini (`backend/`)
- **Frontend** — React, Vite, Tailwind, Mapbox (`frontend/`)

## Quick start

Needs Python 3.10+, Node 20+, Docker.

```bash
# database
docker compose up -d db

# backend (http://localhost:8000)
cd backend
pip install -r requirements.txt
echo 'DATABASE_URL=postgresql+psycopg://soilink:soilink@localhost:5432/soilink' > .env
python seed_db.py
uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string |
| `GOOGLE_API_KEY` | `backend/.env` | Gemini key, required for AI chat |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Mapbox map token |
| `VITE_API_URL` | `frontend/.env` | Backend URL (if not same origin) |
| `AUTH_SECRET` | `backend/.env` | Signs login sessions — set a long random string in production (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | `backend/.env` | First user, created on startup if missing (password ≥ 8 chars) |

Login is checked by the backend; every `/api` route except `/api/auth/*` and the hub webhook `/api/readings/linkedge` needs a session. Add or reset users with `python create_user.py <login>`.

## Run everything in Docker

```bash
docker compose --profile app up -d --build   # app at http://localhost:8000
```

Deployed on Fly.io via `fly.toml`.

See [SETUP.md](SETUP.md) for more detail.
