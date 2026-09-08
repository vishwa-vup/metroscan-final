"""Phase 7: auth + RBAC tests — gate 10 (isolation enforced server-side)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.auth.jwt import create_token  # noqa: E402
from app.main import app  # noqa: E402
from app.ocr import easyocr_engine as engocr  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import PASSWORD, authed, init_test_db, login_headers, seed_user, teardown_test_db  # noqa: E402
from make_label import make_label_png  # noqa: E402


class FakeReader:
    def readtext(self, img):
        return [([[60, 140], [560, 140], [560, 190], [60, 190]], "Mfd by FreshFarm", 0.88)]


@pytest.fixture
def tdb(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    yield tmp_path
    engocr.reset_reader()
    pipe._store = None
    teardown_test_db()


def _upload(c, headers):
    r = c.post("/api/v1/scans", headers=headers,
               files={"image": ("l.png", make_label_png(), "image/png")})
    assert r.status_code == 201, r.text
    return r.json()["scan_id"]


def test_login_me_and_bad_credentials(tdb):
    c = TestClient(app)
    seed_user("insp@t.local", "inspector")
    assert c.post("/api/v1/auth/login",
                  json={"email": "insp@t.local", "password": "wrong"}).status_code == 401
    assert c.post("/api/v1/auth/login",
                  json={"email": "nobody@t.local", "password": PASSWORD}).status_code == 401
    h = login_headers(c, "insp@t.local")
    me = c.get("/api/v1/auth/me", headers=h).json()
    assert me["email"] == "insp@t.local" and me["role"] == "inspector"


def test_login_unknown_email_returns_401_and_creates_no_user(tdb):
    """Security regression: /login must NEVER create users. A never-before-seen
    email returns 401 and the users table row count is unchanged."""
    from app.db import session as dbs
    from app.db.models import User

    c = TestClient(app)
    s = dbs.session_factory()()
    try:
        before = s.query(User).count()
    finally:
        s.close()
    r = c.post("/api/v1/auth/login",
               json={"email": "never-seen-before@t.local", "password": "whatever123"})
    assert r.status_code == 401, r.text
    assert r.json()["detail"] == "invalid credentials"
    s = dbs.session_factory()()
    try:
        assert s.query(User).count() == before
    finally:
        s.close()


def test_expired_jwt_and_missing_token_rejected(tdb):
    c = TestClient(app)
    assert c.get("/api/v1/scans").status_code == 401  # no token
    assert c.get("/api/v1/scans",
                 headers={"Authorization": "Bearer junk"}).status_code == 401
    seed_user("old@t.local", "inspector")
    expired = create_token("old@t.local", "inspector", minutes=-1)
    r = c.get("/api/v1/scans", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401  # gate: expired JWT rejected


def test_cross_business_access_blocked_gate13(tdb):
    c = TestClient(app)
    ha, _ = authed(c, "business", "a@biz.local", "BizA")
    hb, _ = authed(c, "business", "b@biz.local", "BizB")
    sid = _upload(c, ha)
    assert c.get(f"/api/v1/scans/{sid}", headers=hb).status_code == 404  # no leak
    assert c.get(f"/api/v1/scans/{sid}/evidence", headers=hb).status_code == 404
    assert c.get(f"/api/v1/scans/{sid}/report/pdf", headers=hb).status_code == 404
    mine = c.get("/api/v1/scans", headers=hb).json()
    assert mine["total"] == 0  # B sees none of A's scans
    mine_a = c.get("/api/v1/scans", headers=ha).json()
    assert mine_a["total"] == 1  # A sees its own


def test_business_cannot_review_inspector_can(tdb):
    c = TestClient(app)
    ha, _ = authed(c, "business", "a@biz.local", "BizA")
    hi, _ = authed(c, "inspector", "i@t.local")
    sid = _upload(c, ha)
    scan = c.get(f"/api/v1/scans/{sid}", headers=ha).json()
    pend = next(f["rule_id"] for f in scan["findings"]
                if f["machine_status"] == "COULD_NOT_RELIABLY_VERIFY")
    body = {"rule_id": pend, "action": "clear", "reviewer": ""}
    assert c.post(f"/api/v1/scans/{sid}/reviews", headers=ha, json=body).status_code == 403
    r = c.post(f"/api/v1/scans/{sid}/reviews", headers=hi, json=body)
    assert r.status_code == 201  # reviewer falls back to JWT identity
    assert r.json()["reviewer"] == "i@t.local"


def test_admin_user_management_and_rbac(tdb):
    c = TestClient(app)
    hadmin, _ = authed(c, "admin", "root@t.local")
    hi, _ = authed(c, "inspector", "i@t.local")
    assert c.get("/api/v1/admin/users", headers=hi).status_code == 403  # gate 20
    users = c.get("/api/v1/admin/users", headers=hadmin).json()
    assert len(users) == 2
    r = c.post("/api/v1/admin/users", headers=hadmin,
               json={"email": "n@t.local", "password": "pw12345", "role": "business",
                     "business_name": "NewCo"})
    assert r.status_code == 201 and r.json()["business_id"] is not None
    uid = r.json()["id"]
    assert c.post("/api/v1/admin/users", headers=hadmin,
                  json={"email": "n@t.local", "password": "x", "role": "inspector"}).status_code == 409
    r = c.patch(f"/api/v1/admin/users/{uid}", headers=hadmin, json={"role": "inspector"})
    assert r.json()["role"] == "inspector"
    assert c.patch("/api/v1/admin/users/9999", headers=hadmin,
                   json={"role": "inspector"}).status_code == 404


def test_rules_validate_is_admin_only(tdb):
    c = TestClient(app)
    hi, _ = authed(c, "inspector", "i@t.local")
    hadmin, _ = authed(c, "admin", "root@t.local")
    assert c.get("/api/v1/rules", headers=hi).status_code == 200
    assert c.post("/api/v1/rules/validate", headers=hi,
                  json={"ruleset": {}}).status_code == 403
    assert c.post("/api/v1/rules/validate", headers=hadmin,
                  json={"ruleset": {"version": "x", "rules": []}}).status_code == 422
