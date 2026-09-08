# Phase 2 log — Field extraction ✅ GATE 3 PASSED (fields from fixtures)

Scope (§34): regex, proximity, candidate ranking, field schemas, confidence propagation.

## Changed files
- `backend/app/extraction/schemas.py` (Candidate/ExtractedField: raw + normalized + conf + boxes + alternatives + transforms + meta)
- `backend/app/extraction/regex_patterns.py` (money/qty/dim/date/phone/email + 6 keyword-alias lists)
- `backend/app/extraction/proximity.py` (normalized distance, same-line, edge alignment, anchor scoring)
- `backend/app/extraction/fields.py` (6 extractors: MRP/proximity-ranked, qty sans dimensions,
  mfg-vs-expiry split, consumer partial flags, manufacturer role + 3-line address guard)
- `scan_pipeline.py` (+EXTRACTION_* states), `api/v1/scans.py` (fields in responses)
- `backend/tests/test_extraction.py` (12 tests), `test_scans_api.py` (state → EXTRACTION_COMPLETE)
- Frontend: `OcrFieldList.jsx`, live fields in `ScanDetail.jsx`

## Tests executed — 26 passed, 0 failed (full suite)
- Bugs the tests caught and fixed: multipart field name; factory errors unwrapped;
  bare-number fragments (" 500", " 03", pincodes) as MRP → now dropped unless same-line as anchor;
  litre canonical "L"; phone pattern missed "+91 5+5" spacing.

## Key behaviors (verified by test)
- Anchored Rs 99 beats unanchored Rs 149 (never max/first, §12.11–13); rivals preserved as candidates
- 2 close anchored prices → ambiguity penalty 0.7, both kept → review
- No MRP anchor + only bare numbers → missing (never fabricated)
- "10x20 cm" ≠ net quantity; mass vs volume recorded; no unit conversion
- Expiry recorded in meta, never merged into mfg value; multiline address stops at next declaration
- Deterministic: extract twice → identical; empty/garbage tokens → all missing, no raise

## Manual smoke checks
- API fixture scan → `fields.mrp.value_normalized == "99.00 INR"`, state EXTRACTION_COMPLETE

## Blockers — none.

## Next (Phase 3): `rules/ruleset_v1.json` + loader/engine + five-state mapping + /rules endpoints,
gate 4 (correct five-state semantics).
