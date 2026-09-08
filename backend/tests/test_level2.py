"""Phase 8: Level 2 tests — multi-image, annotated evidence, scale (gate 11)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.ocr import easyocr_engine as engocr  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402
from make_label import make_label_png  # noqa: E402


class TwoFaceReader:
    """First OCR call sees the front (identity only); later calls see the back (MRP+qty)."""

    def __init__(self):
        self.n = 0

    def readtext(self, img):
        self.n += 1
        if self.n == 1:
            return [([[60, 140], [560, 140], [560, 190], [60, 190]], "Mfd by FreshFarm", 0.88)]
        return [([[60, 360], [360, 360], [360, 410], [60, 410]], "Net Qty: 500 g", 0.90),
                ([[60, 470], [360, 470], [360, 520], [60, 520]], "MRP Rs 99.00", 0.92)]


@pytest.fixture
def tdb(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(TwoFaceReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "l2@t.local")
    c.headers.update(headers)
    yield c
    engocr.reset_reader()
    pipe._store = None
    teardown_test_db()


def test_multi_image_combines_before_rules(tdb):
    c = tdb
    sid = c.post("/api/v1/scans",
                 files={"image": ("front.png", make_label_png(), "image/png")}).json()["scan_id"]
    first = c.get(f"/api/v1/scans/{sid}").json()
    assert first["fields"]["mrp"]["value_raw"] == ""  # back not seen yet
    r4 = next(f["rule_id"] for f in first["findings"] if f["rule_id"] == "R4")
    r2 = next(f["rule_id"] for f in first["findings"] if f["rule_id"] == "R2")
    assert c.post(f"/api/v1/scans/{sid}/reviews",
                  json={"rule_id": r2, "action": "confirm",
                        "reviewer": "insp"}).status_code == 201

    r = c.post(f"/api/v1/scans/{sid}/images", data={"label": "back"},
               files={"image": ("back.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["fields"]["mrp"]["value_normalized"] == "99.00 INR"  # combined evidence
    assert body["fields"]["net_quantity"]["value_normalized"] == "500 g"
    by_id = {f["rule_id"]: f for f in body["findings"]}
    assert by_id["R4"]["machine_status"] == "VERIFIED_APPEARS_COMPLIANT"
    assert by_id["R2"]["review"]["reviewer"] == "insp"  # reviews carried by rule_id
    assert r.json()["processing_state"] in ("AWAITING_REVIEW", "REVIEW_COMPLETE")
    assert c.post(f"/api/v1/scans/{sid}/images", data={"label": "upside"},
                  files={"image": ("x.png", make_label_png(), "image/png")}).status_code == 400
    assert c.post(f"/api/v1/scans/nope/images", data={"label": "back"},
                  files={"image": ("x.png", make_label_png(), "image/png")}).status_code == 404


def test_annotated_evidence_is_drawn_copy(tdb):
    c = tdb
    sid = c.post("/api/v1/scans",
                 files={"image": ("f.png", make_label_png(), "image/png")}).json()["scan_id"]
    r = c.get(f"/api/v1/scans/{sid}/evidence/annotated")
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n" and len(r.content) > 5000
    orig = c.get(f"/api/v1/scans/{sid}/evidence").content
    assert orig[:8] == b"\x89PNG\r\n\x1a\n" and orig != r.content  # copy annotated, original kept


def test_barcode_scale_is_fallback_with_band(tdb):
    c = tdb
    r = c.post("/api/v1/analysis/scale", json={"barcode_pixel_width": 434.0})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["method"] == "barcode-fallback"
    assert body["band_low"] < body["px_per_mm"] < body["band_high"]
    assert "never" in body["warning"] and "preferred" in body["warning"]
    assert c.post("/api/v1/analysis/scale",
                  json={"barcode_pixel_width": -5}).status_code == 422
