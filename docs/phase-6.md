# Phase 6 log — Quality + placement + readability ✅ GATES 7–9 PASSED

Scope (§34): quality gate first, contour placement, calibrated readability.

## Changed files
- `app/preprocessing/quality.py` (blur/dims/brightness/contrast, configurable, exact recapture message)
- `scan_pipeline.py` (+run_quality_gate → QUALITY_REJECTED + QualityRejected; +run_analysis_stage)
- `api/v1/scans.py` (gate runs before OCR; 422 carries message + scan_id + metrics; rejected scans persisted)
- `app/analysis/placement.py` (contour heuristic + confidence + containment + uncertainty-only unknown)
- `app/analysis/readability.py` (reference calibration primary; barcode fallback wide band; ±15%)
- `app/rules/engine.py` (no-analysis → COULD_NOT, never POTENTIAL — non-negotiable 16)
- `app/rules/ruleset_v1_1.json` (v1.1: R7/R8 active); loader default → 1.1, v1.0 loadable, history keeps version
- `tests/test_quality.py` (3) + `test_analysis.py` (7); refreshed version assertions
- Frontend: Upload recapture card, ImageUploader onRejected; alembic warning fixed

## Tests executed — 57 passed, 0 failed
- Gate 7: sharp passes; blurry/small/dark/low-contrast fail with verbatim message; 8° rotation tolerated;
  API blurry → 422 + QUALITY_REJECTED + zero findings + dashboard quality_rejected counts it
- Gate 8: contour finds drawn label face; blank → unknown ({}); containment 1/0.5/0 exact;
  outside+confident → POTENTIAL with uncertainty note; unknown panel → COULD_NOT (never violation)
- Gate 9: 100px=10mm → 40px text = 4.0mm ±0.6; barcode fallback wider than reference by construction;
  no calibration → no claim; v1.0 evaluations keep "1.0"

## Manual smoke checks — quality + placement join the Phase 9 demo (blurry label included).

## Blockers — none.

## Next (Phase 7): JWT + RBAC + business isolation + admin, gate 10. Reviewer identity migrates to JWT.
