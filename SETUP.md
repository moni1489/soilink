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

4.  **Configure Environment**:
    - Copy `.env.example` to `.env` if it doesn't exist.
    - Ensure your `GOOGLE_API_KEY` (Gemini) is set for the AI chat features.

5.  **Run the server**:
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
