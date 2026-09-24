# SoiLink Setup Guide

Follow these steps to run the backend and frontend of the SoiLink project.

## 🚀 Backend Setup (FastAPI)

1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```

2.  **Create a virtual environment** (optional but recommended):
    ```bash
    python -m venv .venv
    source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Start PostgreSQL** (из корня репозитория, нужен Docker):
    ```bash
    docker compose up -d db
    ```
    База: `soilink` / пользователь `soilink` / пароль `soilink`, порт `5432`. Данные хранятся в томе `pgdata`.

5.  **Configure Environment** — в `backend/.env`:
    ```env
    DATABASE_URL=postgresql+psycopg://soilink:soilink@localhost:5432/soilink
    ```
    Ссылки вида `postgres://…` (Fly, Heroku) тоже подходят — драйвер подставится автоматически.
    Для AI-чата нужен `GOOGLE_API_KEY` (Gemini).

6.  **Seed the database** (повторный запуск безопасен):
    ```bash
    python seed_db.py
    ```
    Перенести данные из старой SQLite-базы: `python migrate_sqlite_to_postgres.py soilink.db`.

7.  **Run the server**:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```
    The API will be available at `http://localhost:8000`.

---

## 💻 Frontend Setup (Expo/React Native)

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    - Ensure you have a Mapbox token in `.env` (variable `EXPO_PUBLIC_MAPBOX_TOKEN`).

4.  **Run the web version**:
    ```bash
    npm run web
    ```
    Access the dashboard at `http://localhost:8081` (usually).

---

## 🛠 Project Architecture Reference

### Backend Roles:
- **Data Ingestion**: Receives sensor data (readings).
- **External Integration**: Connects to **SoilGrids** API to fetch real-world soil properties based on coordinates.
- **ML Engine**: Uses `XGBoost` and `LightGBM` to predict optimal crops and soil conditions.
- **AI Agent**: Uses **Gemini** to provide a context-aware chat for agronomists, combining sensor data and ML results into natural language.

### Frontend Roles:
- **Real-time Map**: Visualizes sensor locations and heatmaps.
- **Layer System**: Toggles between sensor data and **SoilGrids** global data (Clay, Nitrogen, etc.).
- **Smart Recommendations**: UI for the ML/AI outputs from the backend.
