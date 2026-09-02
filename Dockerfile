# Stage 1: Build the React frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# Stage 2: Build the Python backend and serve
FROM python:3.10-slim
WORKDIR /app

# Copy backend requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Copy built frontend assets into backend/static
COPY --from=frontend-builder /app/frontend/dist /app/static

# Seed the database
RUN python seed_db.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
