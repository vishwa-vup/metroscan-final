# MetroScan live demo script (Phase 9, gate 12)

## 1. Setup (PowerShell)

```powershell
cd C:\Users\VICTUS\metroscan\backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:PYTHONIOENCODING = 'utf-8'   # required on Windows: EasyOCR progress bars
# Demo transport: SQLite file (production uses PostgreSQL via DATABASE_URL — see .env.example)
$env:DATABASE_URL = 'sqlite:///./demo.db'
python -m alembic upgrade head
python -c "from app.db import session as d; from app.auth.passwords import hash_password; from app.db.models import User; d.init_db(); s=d.session_factory()(); s.add(User(email='admin@demo.local', password_hash=hash_password('admin123'), role='admin')); s.commit(); print('admin seeded')"
python -m uvicorn app.main:app --port 8000
# second shell:
cd ..\frontend; npm install; npm run dev   # http://localhost:5173
```

Log in as `admin@demo.local / admin123`, create inspector + business users at `/admin/users`.

## 2. Walkthrough (expected outcomes verified 2026-09-08 with real EasyOCR)

| Step | Action | Expected |
|---|---|---|
| 1 | Upload `sample_labels/label-compliant.png` | R1–R4 ✅ appears compliant; R5/R6 ❓ low-confidence (56%/45%) — needs a closer look; R7/R8 ❓ uncertainty preserved |
| 2 | Review step-1 scan: clear R5, confirm nothing | REVIEW_COMPLETE; audit history lists both |
| 3 | Upload `sample_labels/label-missing-mrp.png` | R4 ❓ “could not be verified from the provided image”; R6 ⚠️ partial contact → pending review |
| 4 | Confirm R6 on step-3 scan | 🔴 Inspector-confirmed issue; machine message preserved verbatim |
| 5 | Upload `sample_labels/label-small-text.png` | Mixed ✅/❓ — font-size-concern story; calibrate via POST /analysis/scale for the size talk-track |
| 6 | Upload `sample_labels/label-blurry.png` | 422 “image quality too low — please upload a clearer or closer photo” + blur metric; zero findings; dashboard quality_rejected +1 |
| 7 | Dashboard `/dashboard` | Confirmed issues counted separately from pending — no merged violation metric |
| 8 | Reports on any scan | PDF + editable DOCX download; re-click retries; disclaimer + limitations inside |
| 9 | Add 2nd view to step-3 scan (POST …/images, label=back) | Combined re-evaluation; R2 review carried by rule_id |
| 10 | Cross-business check | Log in as second business → first business's scans return 404 |

## 3. Judge Q&A talk-track (answer contracts §40)

- **OCR reads ₹99 as ₹89** → original photo stays beside the OCR value; inspector corrects via review note before the report; machine text never overwritten.
- **Which price is MRP?** → keyword + bounding-box proximity ranking, never first/max; rivals preserved as candidates (show `candidates` in scan detail JSON at `/docs`).
- **Back label not shown?** → “could not be verified from the provided image” (step 3, R4).
- **Barcode precision?** → fallback only, band shown by `/analysis/scale`; reference-card calibration preferred.
- **Blurry photo?** → step 6.
- **Why EasyOCR?** → locked choice; ships confidence + boxes as evidence; demo images above are the test record.
- **Why human review?** → transparent inspection aid, never an autonomous legal decision-maker.
