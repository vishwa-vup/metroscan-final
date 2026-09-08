# MetroScan backend — production image (cloud-neutral: Render/Railway/Fly/VPS).
# Python 3.12-slim: stable, compatible with FastAPI/SQLAlchemy/psycopg2-binary/
# torch+EasyOCR wheels. NOT built in this environment (no Docker here).
FROM python:3.12-slim

# System libs: libgl1+libglib for opencv-python, libgomp1 for torch (CPU).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
ENV PYTHONPATH=/app \
    APP_ENV=production

# Writable scan storage for the non-root user (overridable via STORAGE_DIR).
RUN mkdir -p /data/scans backend/var/scans \
 && useradd -m appuser \
 && chown -R appuser:appuser /app /data/scans
USER appuser

# Bake EasyOCR detection + English recognition models into the image (as the
# runtime user, so its ~/.EasyOCR cache is used). Without this, the FIRST scan
# request downloads ~100MB+ at runtime — cloud request timeouts kill it (502)
# and ephemeral disks repeat the download after every restart.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import os,urllib.request; p=os.environ.get('PORT','8000'); urllib.request.urlopen(f'http://localhost:{p}/healthz')"
# Platform PORT at runtime ($PORT set by Render/Railway/Fly); 8000 local default.
# Never baked at build time.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
