"""Phase 4: review integration tests — gate 5 (inspector resolves pending items).
Phase 7: inspector JWT on every call."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

import pytest  # noqa: E402

from app.main import app  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402


@pytest.fixture(autouse=True)
def _clean():
    yield
    _teardown()


def _seeded_client(tmp_path, monkeypatch):
    from app.ocr import easyocr_engine as engocr
    from make_label import make_label_png  # noqa

    class FakeReader:
        def readtext(self, img):
            return [([[60, 140], [560, 140], [560, 190], [60, 190]],
                     "Mfd by FreshFarm", 0.88)]

    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "rev@t.local")
    c.headers.update(headers)
    try:
        r = c.post("/api/v1/scans", files={"image": ("l.png", make_label_png(), "image/png")})
        assert r.status_code == 201, r.text
        return c, r.json()["scan_id"]
    finally:
        engocr.reset_reader()


def _teardown():
    from app.services import scan_pipeline as _p
    _p._store = None
    teardown_test_db()


def _pending(scan):
    return [f for f in scan["findings"]
            if f["machine_status"] in ("POTENTIAL_NON_COMPLIANCE", "COULD_NOT_RELIABLY_VERIFY")
            and not f.get("review")]


def test_gate5_confirm_and_clear(tmp_path, monkeypatch):
    c, sid = _seeded_client(tmp_path, monkeypatch)
    scan = c.get(f"/api/v1/scans/{sid}").json()
    pend = _pending(scan)
    assert len(pend) >= 2
    machine_msg = {f["rule_id"]: f["message"] for f in scan["findings"]}

    r = c.post(f"/api/v1/scans/{sid}/reviews",
               json={"rule_id": pend[0]["rule_id"], "action": "confirm",
                     "reviewer": "insp. Rao", "note": "checked original"})
    assert r.status_code == 201, r.text
    assert r.json()["new_status"] == "INSPECTOR_CONFIRMED_ISSUE"

    r = c.post(f"/api/v1/scans/{sid}/reviews",
               json={"rule_id": pend[1]["rule_id"], "action": "clear",
                     "reviewer": "insp. Rao"})
    assert r.json()["new_status"] == "INSPECTOR_CONFIRMED_COMPLIANT"

    scan = c.get(f"/api/v1/scans/{sid}").json()
    by_id = {f["rule_id"]: f for f in scan["findings"]}
    # machine findings preserved verbatim; review attached alongside
    assert by_id[pend[0]["rule_id"]]["message"] == machine_msg[pend[0]["rule_id"]]
    assert by_id[pend[0]["rule_id"]]["review"]["reviewer"] == "insp. Rao"
    assert len(scan["reviews"]) == 2  # audit trail kept
    assert scan["reviews"][0]["at"] <= scan["reviews"][1]["at"]


def test_review_complete_when_all_resolved(tmp_path, monkeypatch):
    c, sid = _seeded_client(tmp_path, monkeypatch)
    scan = c.get(f"/api/v1/scans/{sid}").json()
    for f in _pending(scan):
        assert c.post(f"/api/v1/scans/{sid}/reviews",
                      json={"rule_id": f["rule_id"], "action": "clear",
                            "reviewer": "i"}).status_code == 201
    assert c.get(f"/api/v1/scans/{sid}").json()["processing_state"] == "REVIEW_COMPLETE"


def test_review_validation(tmp_path, monkeypatch):
    c, sid = _seeded_client(tmp_path, monkeypatch)
    scan = c.get(f"/api/v1/scans/{sid}").json()
    verified = next(f["rule_id"] for f in scan["findings"]
                    if f["machine_status"] == "VERIFIED_APPEARS_COMPLIANT")
    pend = _pending(scan)[0]["rule_id"]
    bad_requests = [
        {"rule_id": "RX", "action": "confirm", "reviewer": "i"},      # unknown rule
        {"rule_id": verified, "action": "clear", "reviewer": "i"},    # not pending
        {"rule_id": pend, "action": "ban", "reviewer": "i"},          # bad action
    ]
    for b in bad_requests:
        assert c.post(f"/api/v1/scans/{sid}/reviews", json=b).status_code == 422, b
    # blank reviewer falls back to the JWT identity (Phase 7)
    r = c.post(f"/api/v1/scans/{sid}/reviews",
               json={"rule_id": pend, "action": "clear", "reviewer": "  "})
    assert r.status_code == 201 and r.json()["reviewer"] == "rev@t.local"
    pend2 = _pending(c.get(f"/api/v1/scans/{sid}").json())[0]["rule_id"]
    ok = {"rule_id": pend2, "action": "clear", "reviewer": "i"}
    assert c.post(f"/api/v1/scans/{sid}/reviews", json=ok).status_code == 201
    assert c.post(f"/api/v1/scans/{sid}/reviews", json=ok).status_code == 422  # no double review
    assert c.post("/api/v1/scans/nope/reviews", json=ok).status_code == 404
