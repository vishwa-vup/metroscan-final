# Final acceptance map — §41 (26 items), verified 2026-09-08

Source: full backend suite (67 tests) + frontend builds + real-EasyOCR smoke on the 4 demo labels.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | login works | ✅ | test_auth login/me/bad-password |
| 2 | upload works | ✅ | test_scans_api + demo steps 1–5 |
| 3 | camera works | 🟡 manual (browser) | CameraCapture (permissions, fallback, recapture) builds; needs a real device/browser check |
| 4 | quality gate works | ✅ | test_quality + demo step 6 (blur 1.72 rejected, metrics shown) |
| 5 | OpenCV preprocessing works | ✅ | test_preprocessing (independent + combined + immutable + deterministic) |
| 6 | EasyOCR works | ✅ | real-model smoke: 6/5/6 tokens on demo labels with boxes + confidence |
| 7 | OCR confidence preserved | ✅ | OcrToken.confidence end-to-end; OcrConfidenceList UI |
| 8 | bounding boxes preserved | ✅ | xyxy convention; evidence_boxes on fields + findings; annotated PNG |
| 9 | field extraction works | ✅ | gate-3 fixture test, all six fields |
| 10 | MRP disambiguation works | ✅ | anchored-99 beats far-149; ambiguity penalty; bare numbers dropped |
| 11 | JSON rules load | ✅ | v1.0 + v1.1 load; malformed rejected |
| 12 | rule clauses appear | ✅ | every finding asserts clause + evidence |
| 13 | evidence appears | ✅ | evidence endpoints + annotated images |
| 14 | five statuses work | ✅ | decide() + engine + review transitions, all five observed in tests |
| 15 | human review works | ✅ | gate-5 tests + demo steps 2, 4 |
| 16 | audit history works | ✅ | reviews list + audit_events rows asserted |
| 17 | PostgreSQL persistence works | 🟡 transport note | Same SQLAlchemy models; exercised on SQLite here (no local PG server); deploy sets DATABASE_URL to PostgreSQL; migration creates all 11 tables |
| 18 | search works | ✅ | filters + stable pagination tests |
| 19 | dashboard separates confirmed/pending | ✅ | summary test; no merged metric key exists |
| 20 | PDF works | ✅ | %PDF bytes + endpoint + retry test |
| 21 | DOCX works | ✅ | OOXML with editable disclaimer + field text |
| 22 | RBAC works | ✅ | 401/403/404 matrix in test_auth |
| 23 | Business isolation works | ✅ | cross-business 404s both directions |
| 24 | Admin controls work | ✅ | user CRUD + validate-gating tests |
| 25 | known limitations documented | ✅ | reports carry 4 limitations; DEMO.md + phase logs |
| 26 | no Level 3 feature implemented | ✅ | verified: no autonomy/fake-detection/forensics/predictive/maps/blockchain/custom-model/native-apps/extra-DB/cloud-OCR/offline-sync/auto-penalties |

## Golden scenarios (§33) coverage

1 compliant ✅ smoke · 2 missing ✅ smoke · 3 multi-price ✅ test · 4 OCR-error ✅ review-corrects flow ·
5 low-conf ✅ smoke · 6 blurry ✅ gate · 7 low-contrast ✅ test · 8 partial ✅ multi-image test ·
9 PDP unknown ✅ R7 test · 10 ambiguous ✅ test · 11 confirm ✅ · 12 clear ✅ · 13 cross-business ✅ ·
14 version change ✅ v1.0→v1.1 · 15 PDF ✅ · 16 DOCX ✅ · 17 retry ✅ · 18 unauthorized evidence ✅ ·
19 expired JWT ✅ · 20 admin ✅ — all green in suite or demo log.
