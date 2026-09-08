# Phase 5 log — Reports + DB + dashboard ✅ GATE 6 PASSED (history survives restart)

Scope (§34): PostgreSQL, migrations, ReportLab, python-docx, search, history, dashboard.

## Changed files
- `app/db/models.py` (11 entities §23: User/Business/Product/Scan/OcrToken/ExtractedField/
  RuleEvaluation/InspectorReview/Report/RuleSetVersion/AuditEvent; generic types — Postgres prod, SQLite test transport)
- `app/db/session.py` (engine/session lifecycle/health), `app/db/repository.py` (save/search/summary;
  DB-first with in-memory fallback; pending vs confirmed never merged)
- `migrations/` (alembic env + `0001_initial` covering all tables) + `alembic.ini`
- `app/reports/dto.py` (one DTO), `pdf.py` (ReportLab), `docx.py` (editable python-docx)
- `app/api/v1/reports.py` (pdf/docx/dashboard), scans POST persists + audits, GET /scans search
- `tests/test_db.py` (5) + `test_reports.py` (4)
- Frontend: `components/Dashboard.jsx` (cards/filters/table/report actions), live Dashboard/Scans/ReportPage

## Tests executed — 46 passed, 0 failed
- Gate 6: scan created → store wiped (restart) → search still returns it with buckets
- Migration `upgrade head` creates all 11 tables + alembic_version
- Dashboard: confirmed_issue AND pending_uncertain AND machine_verified counted separately; no merged metric
- Search: filters, stable pagination, empty query; audit rows for scan.created + review.*
- PDF magic %PDF; DOCX OOXML with editable disclaimer + field text; endpoints retry-safe; 404s correct

## Manual smoke checks — dashboard/search/report flows join the Phase 9 demo script.

## Blockers — none. Note: no local PostgreSQL server here, so runtime uses the same code
against SQLite only in tests; deploy sets DATABASE_URL to PostgreSQL (see .env.example).

## Next (Phase 6): quality gate first in pipeline, contour placement, calibrated readability, gate 7–9.
