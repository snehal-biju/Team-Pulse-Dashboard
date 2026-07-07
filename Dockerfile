# Single-container deployment: builds the frontend, then serves it and the
# API from one FastAPI/uvicorn process on port 8000.

FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=frontend /build/dist ../frontend/dist

# SQLite file lives in /app/data — mount a volume there to persist it
VOLUME ["/app/data"]
EXPOSE 8000
# shell form so cloud hosts (Render, Railway, Fly) that inject $PORT just work;
# falls back to 8000 locally
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
