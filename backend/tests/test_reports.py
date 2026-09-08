"""Phase 5: report tests — one DTO feeds both formats; disclaimer + separation enforced."""

import sys
import zipfile
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.reports.dto import DISCLAIMER, build_dto  # noqa: E402
from app.reports.docx import render_docx  # noqa: E402
from app.reports.pdf import render_pdf  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402


@pytest.fixture
def rec(tmp_path, monkeypatch):
    from app.ocr import easyocr_engine as engocr
    from make_label import make_label_png

    class FakeReader:
        def readtext(self, img):
            return [([[60, 140], [560, 140], [560, 190], [60, 190]],
                     "Mfd by FreshFarm", 0.88)]

    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "rep@t.local")
    c.headers.update(headers)
    r = c.post("/api/v1/scans", files={"image": ("l.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    body = r.json()
    yield c, pipe.get_store().get(body["scan_id"])
    engocr.reset_reader()
    pipe._store = None
    teardown_test_db()


def test_dto_separates_machine_from_human(rec):
    _, record = rec
    dto = build_dto(record)
    assert dto["disclaimer"] == DISCLAIMER
    assert dto["limitations"]  # known limitations documented
    assert dto["meta"]["rule_set_version"] == "1.1"
    assert dto["meta"]["pipeline_version"].startswith("0.8")
    assert len(dto["machine_findings"]) + len(dto["human_decisions"]) == len(record.findings)


def test_pdf_bytes_valid(rec):
    _, record = rec
    data = render_pdf(build_dto(record))
    assert data[:4] == b"%PDF" and len(data) > 2000


def test_docx_editable_text(rec):
    _, record = rec
    data = render_docx(build_dto(record))
    assert data[:2] == b"PK"  # OOXML zip
    xml = zipfile.ZipFile(BytesIO(data)).read("word/document.xml").decode("utf-8")
    assert "MetroScan" in xml and "decision support only" in xml.lower()  # disclaimer inside
    assert "manufacturer_name" in xml  # real field text, editable — not an image


def test_report_endpoints_and_retry(rec):
    c, record = rec
    sid = record.scan_id
    r1 = c.get(f"/api/v1/scans/{sid}/report/pdf")
    assert r1.status_code == 200 and r1.headers["content-type"] == "application/pdf"
    r2 = c.get(f"/api/v1/scans/{sid}/report/pdf")  # retry regenerates
    assert r2.status_code == 200 and len(r2.content) > 2000
    d = c.get(f"/api/v1/scans/{sid}/report/docx")
    assert d.status_code == 200 and "officedocument" in d.headers["content-type"]
    assert c.get("/api/v1/scans/nope/report/pdf").status_code == 404
    # §26 lifecycle: report generation drives REPORT_GENERATING → COMPLETE
    assert c.get(f"/api/v1/scans/{sid}").json()["processing_state"] == "COMPLETE"
