"""Phase 5: database tests — migration, persistence across restart, search, dashboard."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import repository as repo  # noqa: E402
from app.db import session as dbs  # noqa: E402
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
    """SQLite file as transport for the same SQLAlchemy models (prod = PostgreSQL)."""
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    c = TestClient(app)
    headers, _ = authed(c, "inspector", "db@t.local")
    c.headers.update(headers)
    yield c
    engocr.reset_reader()
    pipe._store = None
    teardown_test_db()


def _scan(c):
    from make_label import make_label_png
    r = c.post("/api/v1/scans", files={"image": ("l.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    return r.json()


def test_db_available_recovers_from_transient_failure(monkeypatch):
    """Part E: a single failed probe (cold cloud DB) followed by success must
    recover via the retry instead of failing outright."""
    calls = {"n": 0}

    def flaky():
        calls["n"] += 1
        return calls["n"] >= 2

    monkeypatch.setattr(dbs, "db_ping", flaky)
    assert repo.db_available() is True
    assert calls["n"] == 2


def test_db_available_still_fails_when_down(monkeypatch):
    """Part E: a genuinely dead database still reports False after the retry."""
    calls = {"n": 0}

    def down():
        calls["n"] += 1
        return False

    monkeypatch.setattr(dbs, "db_ping", down)
    assert repo.db_available() is False
    assert calls["n"] == 2


def test_migration_upgrade_head(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/mig.db")
    from app.core_config import get_settings
    get_settings.cache_clear()
    dbs.reset_engine()
    try:
        from alembic.config import Config
        from alembic import command
        cfg = Config(str(Path("alembic.ini").resolve()))
        cfg.set_main_option("script_location", str(Path("migrations").resolve()))
        command.upgrade(cfg, "head")
        from sqlalchemy import inspect
        tables = set(inspect(dbs.get_engine()).get_table_names())
        for t in ("users", "businesses", "products", "scans", "ocr_tokens",
                  "extracted_fields", "rule_evaluations", "inspector_reviews",
                  "reports", "ruleset_versions", "audit_events", "alembic_version"):
            assert t in tables, t
    finally:
        dbs.reset_engine()
        get_settings.cache_clear()


def test_gate6_history_survives_restart(dbo):
    c = dbo
    body = _scan(c)
    assert repo.db_available()
    items, total = repo.search_scans()
    assert total == 1 and items[0]["scan_id"] == body["scan_id"]
    pipe._store = None  # simulate restart: memory gone
    items, total = repo.search_scans()
    assert total == 1  # ...but history retained in the database
    assert items[0]["buckets"]  # bucketed for dashboard/search


def test_dashboard_keeps_pending_and_confirmed_separate(dbo):
    c = dbo
    body = _scan(c)
    sid = body["scan_id"]
    pend = next(f["rule_id"] for f in body["findings"]
                if f["machine_status"] == "COULD_NOT_RELIABLY_VERIFY")
    assert c.post(f"/api/v1/scans/{sid}/reviews",
                  json={"rule_id": pend, "action": "confirm",
                        "reviewer": "insp. Rao"}).status_code == 201
    s = c.get("/api/v1/dashboard/summary").json()
    assert s["total_scans"] == 1
    assert s["confirmed_issue"] >= 1 and s["pending_uncertain"] >= 1
    assert "violations" not in s  # never one merged violation metric
    assert s["machine_verified"] >= 1  # R1 verified on the stub image


def test_search_filters_and_pagination(dbo):
    c = dbo
    _scan(c)
    _scan(c)
    all_items, total = repo.search_scans()
    assert total == 2
    page1, _ = repo.search_scans(page=1, size=1)
    page2, _ = repo.search_scans(page=2, size=1)
    assert page1[0]["scan_id"] != page2[0]["scan_id"]  # stable distinct pages
    r = c.get("/api/v1/scans", params={"status": "pending_uncertain", "size": 1})
    assert r.status_code == 200 and r.json()["total"] == 2
    r = c.get("/api/v1/scans", params={"q": "no-such-scan"})
    assert r.json()["total"] == 0


def test_audit_trail_recorded(dbo):
    c = dbo
    body = _scan(c)
    s = dbs.session_factory()()
    try:
        from app.db.models import AuditEvent
        acts = {e.action for e in s.query(AuditEvent).all()}
        assert "scan.created" in acts
    finally:
        s.close()
    pend = next(f["rule_id"] for f in body["findings"]
                if f["machine_status"] == "COULD_NOT_RELIABLY_VERIFY")
    c.post(f"/api/v1/scans/{body['scan_id']}/reviews",
           json={"rule_id": pend, "action": "clear", "reviewer": "i"})
    s = dbs.session_factory()()
    try:
        from app.db.models import AuditEvent
        acts = {e.action for e in s.query(AuditEvent).all()}
        assert "review.clear" in acts
    finally:
        s.close()


def test_resave_does_not_duplicate_reviews(dbo):
    """Regression: re-saving a scan replaces snapshot children, never duplicates."""
    from app.db.models import InspectorReview

    c = dbo
    body = _scan(c)
    sid = body["scan_id"]
    pend = next(f["rule_id"] for f in body["findings"]
                if f["machine_status"] == "COULD_NOT_RELIABLY_VERIFY")
    assert c.post(f"/api/v1/scans/{sid}/reviews",
                  json={"rule_id": pend, "action": "confirm",
                        "reviewer": "i"}).status_code == 201
    repo.save_scan(pipe.get_store().get(sid))
    repo.save_scan(pipe.get_store().get(sid))
    s = dbs.session_factory()()
    try:
        assert s.query(InspectorReview).filter_by(scan_id=sid).count() == 1
    finally:
        s.close()
