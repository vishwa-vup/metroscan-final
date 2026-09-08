"""Regression test: scan results must persist parent + children together.

Covers the "upload succeeds but no output" failure where the scan INSERT was
skipped while child INSERTs ran (FK violation on PostgreSQL/Supabase),
surfacing as HTTP 500 and an unretrievable scan.
Uses the SQLite-file transport + FakeReader like the rest of the suite.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import repository as repo  # noqa: E402
from app.db import session as dbs  # noqa: E402
from app.db.models import ExtractedField, Scan  # noqa: E402
from app.main import app  # noqa: E402
from app.ocr import easyocr_engine as engocr  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402


class FakeReader:
    def readtext(self, img):
        return [([[60, 140], [560, 140], [560, 190], [60, 190]],
                 "Mfd by FreshFarm", 0.88)]


@pytest.fixture
def dbo(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "savescan@t.local")
    c.headers.update(headers)
    yield c
    engocr.reset_reader()
    pipe._store = None
    teardown_test_db()


def test_save_scan_persists_parent_before_children(dbo):
    from make_label import make_label_png
    r = dbo.post("/api/v1/scans", files={"image": ("l.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    scan_id = r.json()["scan_id"]

    # Parent row must exist (pre-fix it was silently skipped -> FK 500).
    s = dbs.session_factory()()
    try:
        assert s.get(Scan, scan_id) is not None, "scans row missing after upload"
        n = s.query(ExtractedField).filter_by(scan_id=scan_id).count()
        assert n > 0, "no extracted fields persisted"
    finally:
        s.close()

    # Saved result must be retrievable with its data.
    d = dbo.get(f"/api/v1/scans/{scan_id}")
    assert d.status_code == 200, d.text
    body = d.json()
    assert body["fields"], "detail returned no fields"
    assert body["ocr_tokens"] > 0, "detail returned no OCR tokens"
