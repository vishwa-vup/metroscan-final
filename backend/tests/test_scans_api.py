"""Phase 1: upload API tests (validation per §9 rules 1–3 + API rule 5).
Phase 7: all calls authenticated; unauthenticated access rejected."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.ocr import easyocr_engine as eng  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402
from make_label import make_label_png  # noqa: E402


class FakeReader:
    def readtext(self, img):
        return [([[60, 70], [500, 70], [500, 120], [60, 120]], "FreshFarm", 0.9)]


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    eng.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "up@t.local")
    c.headers.update(headers)  # default auth for every call below
    yield c
    eng.reset_reader()
    pipe._store = None
    teardown_test_db()


def test_unauthenticated_upload_rejected():
    from fastapi.testclient import TestClient as TC
    anon = TC(app)
    assert anon.post("/api/v1/scans",
                     files={"image": ("l.png", make_label_png(), "image/png")}).status_code == 401


def test_upload_runs_pipeline_and_preserves_raw_ocr(client):
    r = client.post("/api/v1/scans", files={"image": ("label.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["processing_state"] == "AWAITING_REVIEW"  # pipeline: OCR then extraction
    assert body["ocr"]["tokens"][0]["text"] == "FreshFarm"

    scan_id = body["scan_id"]
    assert client.get(f"/api/v1/scans/{scan_id}").status_code == 200
    ocr = client.get(f"/api/v1/scans/{scan_id}/ocr").json()
    assert ocr["tokens"] and ocr["engine"] == "easyocr"
    ev = client.get(f"/api/v1/scans/{scan_id}/evidence")
    assert ev.status_code == 200  # original evidence retrievable


def test_rejects_empty_unsupported_oversized_corrupt(client):
    assert client.post("/api/v1/scans", files={"image": ("e.png", b"", "image/png")}).status_code in (400, 422)
    assert client.post("/api/v1/scans", files={"image": ("a.txt", b"hi", "text/plain")}).status_code == 400
    big = b"\xff" * (11 * 1024 * 1024)
    assert client.post("/api/v1/scans", files={"image": ("b.png", big, "image/png")}).status_code == 413
    assert client.post("/api/v1/scans", files={"image": ("c.png", b"junk", "image/png")}).status_code == 422
    assert client.get("/api/v1/scans/nope").status_code == 404
