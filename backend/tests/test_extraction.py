"""Phase 2: extraction tests — regex, proximity, ranking, gate 3 (fields from fixtures)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.extraction.fields import extract_all  # noqa: E402
from app.extraction.proximity import (  # noqa: E402
    anchor_score,
    norm_distance,
    same_line,
)
from app.extraction.regex_patterns import (  # noqa: E402
    DIM_RE,
    EMAIL_RE,
    MONTH_YEAR_RE,
    MONEY_RE,
    PHONE_RE,
    QTY_RE,
)
from app.main import app  # noqa: E402
from app.ocr import easyocr_engine as eng  # noqa: E402
from app.ocr.schemas import OcrToken  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402

W, H = 1200, 900


def T(i, text, conf, box):
    return OcrToken(text=text, confidence=conf, box=box,
                    box_convention="xyxy-top-left-origin", index=i)


def label_tokens():
    return [
        T(0, "Mfd by: FreshFarm Foods", 0.88, [60, 140, 560, 190]),
        T(1, "Plot 12, MIDC Area, Pune 411026", 0.85, [60, 250, 700, 300]),
        T(2, "Net Qty: 500 g", 0.90, [60, 360, 360, 410]),
        T(3, "MRP Rs 99.00", 0.92, [60, 470, 360, 520]),
        T(4, "Mfg 03/2025", 0.87, [60, 580, 340, 630]),
        T(5, "Consumer Care 1800-123-456", 0.80, [60, 690, 600, 740]),
    ]


def test_regex_units():
    assert MONEY_RE.search("MRP Rs 99.00").group(2) == "99.00"
    assert MONEY_RE.search("₹1,299.50").group(2) == "1,299.50"
    assert QTY_RE.search("500 g").groups() == ("500", "g")
    assert QTY_RE.search("1 Litre").group(2).lower().startswith("litre")
    assert DIM_RE.search("10x20 cm")  # dimensions recognized as dimensions
    assert MONTH_YEAR_RE.search("03/2025")
    assert MONTH_YEAR_RE.search("March 2025")
    assert PHONE_RE.search("1800-123-456")
    assert PHONE_RE.search("+91 98765 43210")
    assert not PHONE_RE.search("411026")  # pincode is not a phone (§16.6)
    assert EMAIL_RE.search("care@freshfarm.in")


def test_proximity_signals():
    a, b, c = [0, 0, 100, 30], [110, 5, 200, 35], [0, 500, 100, 530]
    assert same_line(a, b) and not same_line(a, c)
    assert norm_distance(a, b, W, H) < norm_distance(a, c, W, H)
    assert anchor_score(0.01, True, True) < anchor_score(0.4, False, False)


def test_gate3_all_fields_from_fixture():
    f = extract_all(label_tokens(), W, H)
    assert f["mrp"].value_normalized == "99.00 INR", f["mrp"]
    assert f["net_quantity"].value_normalized == "500 g"
    assert f["net_quantity"].meta["unit_kind"] == "mass"
    assert "FreshFarm" in f["manufacturer_name"].value_raw
    assert "Pune 411026" in f["manufacturer_address"].value_raw
    assert "Net Qty" not in f["manufacturer_address"].value_raw  # stopped at next declaration
    assert f["date_of_manufacture"].value_raw == "03/2025"
    assert "1800-123-456" in f["consumer_care"].value_raw
    assert f["consumer_care"].meta["partial"] is True  # phone only
    for k, v in f.items():
        assert v.confidence > 0, k
        assert v.ocr_confidence > 0 and v.evidence_boxes, k  # confidence + evidence always


def test_anchored_price_beats_far_larger_price():
    toks = label_tokens() + [T(6, "Rs 149.00", 0.95, [800, 150, 1000, 200])]
    f = extract_all(toks, W, H)
    assert f["mrp"].value_normalized == "99.00 INR"  # never max-price (§12.11)
    assert any("149" in c.value_raw for c in f["mrp"].candidates)  # rival preserved


def test_three_prices_ambiguity_lowers_confidence():
    toks = [T(0, "MRP Rs 99.00", 0.92, [60, 470, 360, 520]),
            T(1, "MRP Rs 109.00", 0.90, [60, 560, 370, 610])]
    f = extract_all(toks, W, H)
    assert f["mrp"].confidence < 0.92  # ambiguity penalty
    assert len(f["mrp"].candidates) == 2


def test_bare_numbers_never_become_mrp():
    toks = [T(0, "Plot 12, Pune 411026", 0.9, [60, 250, 700, 300])]
    assert extract_all(toks, W, H)["mrp"].value_raw == ""


def test_dimensions_not_net_quantity():
    toks = [T(0, "Size 10x20 cm", 0.9, [60, 360, 360, 410]),
            T(1, "Net Qty: 1 L", 0.9, [60, 470, 360, 520])]
    f = extract_all(toks, W, H)
    assert f["net_quantity"].value_normalized == "1 L"
    assert f["net_quantity"].meta["unit_kind"] == "volume"


def test_expiry_kept_separate_from_mfg():
    toks = [T(0, "Mfg 03/2025", 0.9, [60, 580, 340, 630]),
            T(1, "Exp 02/2027", 0.9, [60, 690, 340, 740])]
    f = extract_all(toks, W, H)
    assert f["date_of_manufacture"].value_raw == "03/2025"
    assert f["date_of_manufacture"].meta["expiry_seen"] == "02/2027"


def test_roles_exposed_and_ambiguous():
    toks = [T(0, "Imported by Global Trade", 0.9, [60, 140, 560, 190]),
            T(1, "Packed by Local Unit", 0.85, [60, 250, 560, 300])]
    f = extract_all(toks, W, H)
    assert f["manufacturer_name"].meta["role"] == "ambiguous"
    assert sorted(f["manufacturer_name"].meta["role_candidates"]) == ["importer", "packer"]


def test_empty_and_garbage_never_fabricate():
    for toks in ([], [T(0, "", 0.0, [0, 0, 0, 0])]):
        f = extract_all(toks, W, H)  # total: must not raise
        assert all(v.value_raw == "" and v.confidence == 0.0 for v in f.values())


def test_deterministic():
    a = extract_all(label_tokens(), W, H)
    b = extract_all(label_tokens(), W, H)
    assert a == b


def test_api_returns_fields_gate3(tmp_path, monkeypatch):
    class FakeReader:
        def readtext(self, img):
            rows = [(t.text, t.box, t.confidence) for t in label_tokens()]
            return [([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]], tx, cf)
                    for tx, b, cf in rows]

    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    eng.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "ex@t.local")
    c.headers.update(headers)
    try:
        from make_label import make_label_png
        r = c.post("/api/v1/scans", files={"image": ("l.png", make_label_png(), "image/png")})
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["processing_state"] == "AWAITING_REVIEW"  # OCR→extraction→rules
        assert body["fields"]["mrp"]["value_normalized"] == "99.00 INR"
    finally:
        eng.reset_reader()
        pipe._store = None
        teardown_test_db()
