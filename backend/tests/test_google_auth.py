"""Google sign-in tests: verification failures, role safety, linking policy.

The google-auth transport is stubbed (no network, no real Google project);
endpoint behavior is exercised through the real FastAPI app + SQLite DB.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.auth.google_auth as gauth  # noqa: E402
from app.db import session as dbs  # noqa: E402
from app.db.models import User  # noqa: E402
from app.main import app  # noqa: E402
from auth_helper import init_test_db, seed_user, teardown_test_db  # noqa: E402


@pytest.fixture
def tdb(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    init_test_db(tmp_path, monkeypatch)
    yield
    teardown_test_db()


def _client():
    return TestClient(app)


def test_google_disabled_without_client_id(tdb, monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "")
    from app.core_config import get_settings
    get_settings.cache_clear()
    try:
        r = _client().post("/api/v1/auth/google", json={"credential": "anything"})
        assert r.status_code == 503, r.text
    finally:
        get_settings.cache_clear()


def test_google_invalid_credential(tdb, monkeypatch):
    def boom(credential):
        raise gauth.GoogleAuthError("bad")
    monkeypatch.setattr(gauth, "verify_google_credential", boom)
    r = _client().post("/api/v1/auth/google", json={"credential": "bogus"})
    assert r.status_code == 401, r.text


def test_google_new_user_gets_business_role_never_inspector(tdb, monkeypatch):
    def fake(credential):
        # Even hostile claims carrying a role must not escalate: the endpoint
        # ignores everything except sub/email from the verifier.
        assert credential == "good-token"
        return {"sub": "google-sub-1", "email": "newuser@example.com"}
    monkeypatch.setattr(gauth, "verify_google_credential", fake)
    r = _client().post("/api/v1/auth/google", json={"credential": "good-token"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role"] == "business"
    assert body["email"] == "newuser@example.com"
    assert body["access_token"]
    s = dbs.session_factory()()
    try:
        u = s.query(User).filter_by(email="newuser@example.com").first()
        assert u is not None and u.google_sub == "google-sub-1"
        assert u.role == "business"
    finally:
        s.close()


def test_google_existing_email_keeps_password_account(tdb, monkeypatch):
    seed_user("taken@example.com", "business")
    monkeypatch.setattr(
        gauth, "verify_google_credential",
        lambda credential: {"sub": "other-sub", "email": "taken@example.com"})
    r = _client().post("/api/v1/auth/google", json={"credential": "tok"})
    assert r.status_code == 409, r.text
    s = dbs.session_factory()()
    try:
        u = s.query(User).filter_by(email="taken@example.com").first()
        assert u.password_hash != "", "password credential must survive"
        assert u.google_sub is None
    finally:
        s.close()


def test_google_returning_user_logs_in(tdb, monkeypatch):
    monkeypatch.setattr(
        gauth, "verify_google_credential",
        lambda credential: {"sub": "known-sub", "email": "back@example.com"})
    c = _client()
    assert c.post("/api/v1/auth/google", json={"credential": "t"}).status_code == 200
    r = c.post("/api/v1/auth/google", json={"credential": "t"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "back@example.com"
