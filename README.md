# MetroScan — AI-Assisted Legal Metrology Compliance Scanner
### Smart India Hackathon 2026 · SIH26034 · Ministry of Consumer Affairs

> **Decision-support only.** MetroScan flags *potential non-compliance, pending inspector review* — it never issues an autonomous legal verdict. If a declaration is not visible, it reports *“could not be verified from the provided image”*.

![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-blue) ![Backend](https://img.shields.io/badge/Backend-FastAPI-green) ![OCR](https://img.shields.io/badge/OCR-EasyOCR%20%2B%20OpenCV-orange) ![DB](https://img.shields.io/badge/DB-PostgreSQL-336791)

---

## 1. What it does

Every packaged commodity in India must display: manufacturer / packer / importer name & address, net quantity, MRP, month-year of manufacture, and consumer-care details — in the prescribed format, size and placement (Legal Metrology (Packaged Commodities) Rules, 2011).

MetroScan:
1. Takes a photo of a product label (upload or mobile camera / PWA)
2. Checks image quality → preprocesses (OpenCV) → OCR (EasyOCR)
3. Extracts mandatory fields (regex + bounding-box proximity)
4. Runs a versioned JSON rule engine that cites the exact clause
5. Routes everything to a human inspector for confirm / override
6. Generates a compliance report (PDF + editable DOCX) with evidence crops
7. Stores history in PostgreSQL + shows trends on a dashboard

Five status levels are used everywhere (never binary pass/fail):

| Status | Meaning |
| ------ | ------- |
| ✅ Verified / appears compliant | Confidence ≥ 70%, rule passed |
| ⚠️ Potential non-compliance | Confidence ≥ 70%, rule failed → inspector review |
| ❓ Could not reliably verify | Confidence < 70% → needs closer look, never a violation |
| 🔴 Inspector-confirmed issue | Inspector confirmed a real problem |
| ✅ Inspector-confirmed compliant | Inspector cleared it |

## 2. Tech stack (locked)

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18 + Tailwind CSS, PWA + Camera API, React Router, Vite |
| Backend | Python + FastAPI, Pydantic v2 |
| Image | OpenCV (deskew, denoise, contrast, blur check, PDP contour) |
| OCR | EasyOCR (Torch CPU) + confidence per field |
| Extraction | Regex + bounding-box proximity |
| Rules | JSON ruleset (`backend/app/rules/ruleset_v1*.json`) with `clause` citations |
| Reports | ReportLab (PDF) + python-docx (DOCX) + annotated evidence |
| DB | PostgreSQL 16 + SQLAlchemy + Alembic |
| Auth | JWT (python-jose) + RBAC (Inspector / Business / Admin) |
| Deploy | Docker + Docker Compose + Nginx |

## 3. Project structure

```
metroscan-final/
├── frontend/               # React + Tailwind PWA
│   ├── src/
│   │   ├── api/client.js   # API base (VITE_API_BASE_URL)
│   │   ├── components/     # AppShell, CameraCapture, EvidenceViewer, badges…
│   │   └── pages/          # Login, Capture, Upload, ScanDetail, Review, Dashboard…
│   ├── public/             # manifest.webmanifest, sw.js, icon.svg
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI entrypoint (/healthz, /api/v1/…)
│   │   ├── core_config.py  # .env config
│   │   ├── preprocessing/  # OpenCV quality + enhance
│   │   ├── ocr/            # EasyOCR wrapper
│   │   ├── extraction/     # regex + proximity + schemas
│   │   ├── rules/          # engine.py + ruleset_v1.json
│   │   ├── analysis/       # placement + readability
│   │   ├── reports/        # PDF + DOCX + annotated images
│   │   ├── auth/           # JWT + RBAC
│   │   ├── db/             # models, session, repository, dev_seed
│   │   ├── api/v1/         # scans, reviews, rules, reports, auth, analysis
│   │   └── services/       # scan_pipeline, storage, reviews
│   ├── deploy/             # init_db.py, verify_stack.py
│   ├── migrations/         # Alembic
│   ├── tests/              # pytest (71+ backend tests)
│   ├── requirements.txt
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.yml  # postgres + backend + frontend (nginx)
│   ├── nginx.conf
│   └── .env.production.example
├── sample_labels/          # 4 demo labels + generate.py
├── docs/                   # DEMO.md, ACCEPTANCE.md, phase-0…phase-9
├── .vscode/                # launch + tasks
├── .env.example
├── DEPLOY.md / CLOUD_DEPLOY.md
└── PROJECT_BRIEF.md
```

Per-folder guides: `backend/README.md`, `frontend/README.md`, `sample_labels/README.md`, `docs/README.md`.

## 4. Quickstart (local dev)

Prerequisites: Python 3.11+, Node 18+, PostgreSQL 16 (or Docker).

```powershell
# 1) Clone
git clone https://github.com/vishwa-vup/metroscan-final.git
cd metroscan-final

# 2) Environment
Copy-Item .env.example .env
# Edit .env → set JWT_SECRET, DATABASE_URL, CORS_ORIGINS

# 3) Backend
cd backend
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# → http://localhost:8000/docs  (try /healthz, /api/v1/version)

# 4) Frontend (new terminal)
cd ..\frontend
Copy-Item .env.example .env   # sets VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev
# → http://localhost:5173
```

First dev run auto-seeds one admin **only if users table is empty**:

- Email: `admin@local.dev` (override `ADMIN_EMAIL`)
- Password: `changeme-dev-only` (override `ADMIN_PASSWORD`)

Production never seeds — create users via `python backend/deploy/init_db.py`.

## 5. Demo in 5 minutes

```powershell
cd backend
pytest tests\test_health.py -v
python tests\make_label.py   # regenerates sample_labels if needed
```

Then in UI: Upload `sample_labels/label-compliant.png` → ✅, `label-missing-mrp.png` → ⚠️ missing MRP, `label-blurry.png` → quality stop, `label-small-text.png` → readability flag. See `docs/DEMO.md` + `docs/ACCEPTANCE.md`.

## 6. Key API endpoints

- `GET /healthz` — liveness · `GET /health/db` — DB check
- `POST /api/v1/scans` (multipart image) → quality → OCR → extraction → rules
- `GET /api/v1/scans/{id}` · `POST /api/v1/reviews` (inspector confirm/override)
- `GET /api/v1/reports/{id}.pdf` / `.docx`
- `GET /api/v1/rules` (versioned JSON) · `POST /api/v1/auth/login`

Full interactive docs: `http://localhost:8000/docs`.

## 7. Configuration (.env)

| Key | Example | Notes |
| --- | ------- | ----- |
| `DATABASE_URL` | `postgresql+psycopg2://metroscan:changeme@localhost:5432/metroscan` | PostgreSQL only |
| `JWT_SECRET` | 32+ random chars | Never commit |
| `CORS_ORIGINS` | `http://localhost:5173` | Prod frontend domain |
| `STORAGE_DIR` | `backend/var/scans` | Evidence store |
| `OCR_CONFIDENCE_THRESHOLD` | `0.70` | ❓ cutoff |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | dev seed only | Prod uses `init_db.py` |

Frontend: `VITE_API_BASE_URL=http://localhost:8000` (see `frontend/.env.example`).

## 8. Production deploy

See `DEPLOY.md` (Docker Compose) + `CLOUD_DEPLOY.md` (Neon/Supabase free Postgres):

```powershell
Copy-Item deploy\.env.production.example deploy\.env.production
# fill DATABASE_URL, JWT_SECRET, CORS_ORIGINS
docker compose -f deploy/docker-compose.yml up -d --build
```

## 9. Testing

```powershell
cd backend; pytest -v            # backend (auth, OCR contract, rules, reports…)
cd ..\frontend; npm run test     # vitest
```

## 10. Legal disclaimer

Demo / hackathon prototype. Flags are advisory and must be verified by a trained Legal Metrology inspector against the original package and gazette text. Not a legal certificate.

## 11. Licence + credits

MIT — see `LICENSE`. Built for SIH26034. OCR © EasyOCR, PDF © ReportLab.
