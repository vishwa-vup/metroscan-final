# Phase 1 log — OCR pipeline ✅ GATE 2 PASSED (real EasyOCR)

Scope (§34): upload, OpenCV preprocessing, EasyOCR, OCR schemas, sample-label test.

## Changed files
- `backend/app/ocr/schemas.py` (OcrToken/OcrResult, xyxy-top-left convention)
- `backend/app/preprocessing/image.py` (grayscale/denoise/CLAHE/deskew, modular, immutable original, metadata)
- `backend/app/ocr/easyocr_engine.py` (lazy reusable Reader, contract mapping, technical-error wrapping, test hook)
- `backend/app/services/storage.py` + `scan_pipeline.py` (15 states §26, validation, in-memory store)
- `backend/app/api/v1/scans.py` (POST/GET detail/ocr/evidence), `main.py` (router)
- `backend/tests/`: conftest, make_label (owned synthetic pixels), test_preprocessing (4),
  test_ocr_contract (5), test_scans_api (2)
- Frontend: `ImageUploader.jsx`, `pages/Upload.jsx`, live `ScanDetail.jsx` (evidence img + tokens)
- `backend/requirements.txt` pin fix (fastapi<0.150 to match env)

## Tests executed — 14 passed, 0 failed
- `pytest tests\` → 14 passed (fixed 2 real bugs: multipart field name `image`; factory errors now OcrEngineError)

## Manual smoke checks (gate 2: real image → OCR boxes + confidence)
- Real EasyOCR (CPU, models cached) on synthetic 1200×900 label → **6 tokens**:
  FreshFarm Foods Pvt Ltd .77, address .85, Net Qty .84, MRP .82, Mfg 1.0, consumer-care .53 — all with boxes.
- Note: Windows shells need `$env:PYTHONIOENCODING='utf-8'` or EasyOCR's progress bar crashes init (cp1252).

## Blockers — none.

## Next (Phase 2): `extraction/{regex_patterns,proximity,fields}.py` + schemas, wire
EXTRACTION_* states, gate 3 (mandatory fields extract from fixtures).
