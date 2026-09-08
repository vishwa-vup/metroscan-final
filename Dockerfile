# MetroScan all-in-one image: React build served by FastAPI (single Render service).
# Same-origin frontend+API: no CORS needed, one free-tier service.
# Build context = repo root.

# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Same-origin API calls (fetch uses relative /api/...) in the bundled app.
ENV VITE_API_BASE_URL=""
RUN npm run build

# ---------- Stage 2: Python backend + static bundle ----------
FROM python:3.12-slim

# System libs: libgl1+libglib for opencv-python, libgomp1 for torch (CPU).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=web /web/dist ./frontend_dist
ENV PYTHONPATH=/app \
    APP_ENV=production \
    FRONTEND_DIST=/app/frontend_dist

RUN mkdir -p /data/scans \
 && useradd -m appuser \
 && chown -R appuser:appuser /app /data/scans
USER appuser

# Bake EasyOCR detection + English recognition models into the image (as the
# runtime user, so its ~/.EasyOCR cache is used). Without this, the FIRST scan
# request downloads ~100MB+ at runtime — cloud request timeouts kill it (502)
# and ephemeral disks repeat the download after every restart.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD python -c "import os,urllib.request; p=os.environ.get('PORT','8000'); urllib.request.urlopen(f'http://localhost:{p}/healthz')"
# Platform PORT at runtime ($PORT set by Render); 8000 local default.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
