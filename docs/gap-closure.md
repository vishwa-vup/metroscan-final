# Gap-closure audit — master prompt vs implementation (2026-09-08)

Method: re-read all 45 sections + 16 endpoints + 15 states + 21 components; executed
proof scripts (not just code inspection). Findings below: 6 real gaps, all fixed except
noted residuals.

## Fixed gaps
1. **InspectorReview duplicate rows (correctness bug, §23.13).** Re-saving a scan re-inserted
   review rows (proven: 3 saves → 3 rows). Fix: snapshot children replaced wholesale.
   Regression test: `test_resave_does_not_duplicate_reviews`.
2. **REPORT_GENERATING / COMPLETE never assigned (§26).** All other 13 states were live.
   Fix: report endpoints drive REPORT_GENERATING → COMPLETE (+ persist); test asserts COMPLETE.
3. **EXIF orientation ignored (camera photos, §9/§29).** Portrait phone uploads decoded sideways.
   Fix: PIL `exif_transpose` in `decode_image`; test with Orientation=6 JPEG.
4. **Observability mostly absent (§31).** Only OCR timing existed. Fix: `app/observability.py`
   (JSON lines: event/scan_id/stages/versions/timings; scrubbed secrets) wired into
   scan/receive/reject/complete, reviews, login success+failure, reports; `X-Request-ID`
   middleware; `test_observability.py` (scrub proof + header proof).
5. **Named components missing (§28).** Logic existed inline; names did not: added
   `QualityResultCard`, `ScanProgress`, `ScanSummary`, `ConfidenceBadge`, `LoadingState`,
   `EmptyState`, `ErrorBanner` — all wired into pages (Upload, ScanDetail, ScanTable, OcrFieldList).
6. **No frontend tests (§32.15).** Added vitest + `npm test`: 9 tests (five-state badges,
   never-invent wording, threshold honesty, feedback states) via server rendering.

## Verified complete (no action)
- 16/16 API endpoints live with auth matrix green; 10/10 routes; 21/21 components now named;
  17/17 review requirements; 15/15 report requirements; 14/14 rule-schema props validated;
  2154 micro-tests covered by category (ImageQuality/OCR/Extraction/Rules/Placement/
  Readability/Review/Auth/Reports/Dashboard all have dedicated suites); 20/20 golden scenarios;
  7/7 judge answers in DEMO.md; 14/14 out-of-scope exclusions respected (nothing extra built).

## Residual minor gaps (honest, low risk)
- **Product search (§30.11):** `q` covers scan id/filename; no product-registry endpoints exist in
  the 16-endpoint contract, so product-linked search has no data source yet.
- **Glare scenario:** no dedicated handler — falls through to quality gate / low-confidence
  uncertainty, which is the specified safe behavior.
- **Manual-only:** real-device camera check; PostgreSQL production deploy (transport-tested);
  localStorage tokens are demo-grade (httpOnly hardening = follow-up).

## Counts: backend 71 passed · frontend 9 passed · 0 failed.
