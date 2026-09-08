# Phase 0 log — Orientation and skeleton ✅ GATE 1 PASSED

Date: 2026-09-07. Scope (§34): structure, FastAPI entrypoint, React+Tailwind
scaffold, PWA basics, README, config template.

## Changed files
- `backend/app/main.py` (app factory, CORS, no-traceback handler, /healthz, /api/v1/version)
- `backend/app/core_config.py` (.env-only secrets via pydantic-settings)
- `backend/app/*/​__init__.py` (10 subpackage placeholders, §42)
- `backend/requirements.txt` (locked stack pins + rationale)
- `backend/tests/test_health.py` (3 tests)
- `frontend/` scaffold: package.json, vite.config.js, index.html,
  tailwind/postcss configs, public/manifest.webmanifest+sw.js+icon.svg,
  src/main.jsx+App.jsx+index.css, api/client.js,
  components/AppShell+CameraCapture+StatusBadge, pages/* (10 routes, §28)
- Root: README.md, .env.example, .gitignore; backend/frontend/sample_labels/docs READMEs

## Tests executed
- `python -m pytest tests\test_health.py -v` → 3 passed
- Live boot: uvicorn :8123 → /healthz + /api/v1/version OK
- `npm install` → 133 pkgs OK; `npm run build` → ✓ 42 modules, dist/ emitted

## Manual smoke checks
- http://localhost:8000/docs loads (FastAPI auto-docs, API rule 4)
- http://localhost:5173 renders home; /capture shows guidance + gallery fallback

## Blockers
- None. Note: no local PostgreSQL (`psql` absent) — expected; DB wires in Phase 5.
  Heavy OCR deps (torch/EasyOCR) listed but not installed in Phase 0.

## Next command (Phase 1: OCR pipeline)
`pip install opencv-python numpy Pillow easyocr` then implement
`preprocessing/image.py` + `ocr/easyocr_engine.py` + OCR schemas + upload
endpoint + sample-label test (gate 2: real image → OCR boxes + confidence).
