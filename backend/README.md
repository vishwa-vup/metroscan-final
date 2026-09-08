# Backend (Python + FastAPI — locked)

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings python-dotenv httpx pytest
python -m uvicorn app.main:app --reload --port 8000
pytest tests\test_health.py -v
```

Full `pip install -r requirements.txt` (OpenCV/EasyOCR/torch/PostgreSQL
drivers/ReportLab/python-docx) is required from Phase 1/5 onward; Phase 0
imports only the light core so `main.py` starts everywhere.

Layout: `app/main.py` (entrypoint) · `app/core_config.py` (.env config) ·
`preprocessing/ ocr/ extraction/ rules/ analysis/ reports/ auth/ db/
api/ services/` (one phase each, see master prompt §42).
