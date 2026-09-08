# Phase 8 log — Level 2 ✅ GATE 11 PASSED (Level 1 stable first)

Scope (§34): one Level 2 feature at a time, only after Level 1 passes (67 green before starting).

## Changed files (one feature at a time)
1. Multi-image (`add_scan_image` + POST /scans/{id}/images): per-view quality gate + OCR,
   deterministic token merge + re-index, extraction → analysis → rules re-run on combined
   evidence; reviews carried forward by rule_id; `images.added` audited.
2. Barcode scale (POST /analysis/scale): midpoint + full 0.8–2.0× band + fallback warning; never exact.
3. Confidence display (`OcrConfidenceList.jsx`): per-token bars in ScanDetail.
4. Annotated evidence (`reports/annotated.py` + GET …/evidence/annotated): PIL boxes on an
   in-memory copy; original immutable; toggle in EvidenceViewer.
- `tests/test_level2.py` (3); pipeline 0.8-phase8.

## Tests executed — 67 passed, 0 failed
- Front-only scan misses MRP → add back view → MRP + qty found, R4 VERIFIED, R2 review carried,
  bad label → 400, unknown scan → 404
- Annotated PNG valid, differs from original bytes; scale band ordering + warning; bad width → 422
- Fixed: `label` must be Form (not query) for multipart; version pin 0.8

## Blockers — none. Out of scope stays out: barcode→database cross-verification remains roadmap.

## Next (Phase 9): owned demo labels ×4, DEMO.md, full suite, acceptance map — gate 12.
