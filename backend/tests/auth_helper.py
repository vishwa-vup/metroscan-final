"""Shared auth/DB fixtures for API tests (Phase 7)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.auth.passwords import hash_password  # noqa: E402
from app.db import session as dbs  # noqa: E402
from app.db.models import Business, User  # noqa: E402

PASSWORD = "secret123"


def init_test_db(tmp_path, monkeypatch):
    """Point DATABASE_URL + STORAGE_DIR at tmp; fresh engine + schema."""
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/t.db")
    from app.core_config import get_settings
    get_settings.cache_clear()
    dbs.reset_engine()
    dbs.init_db()


def teardown_test_db():
    from app.core_config import get_settings
    dbs.reset_engine()
    get_settings.cache_clear()


def seed_user(email, role, password=PASSWORD, business_name=""):
    s = dbs.session_factory()()
    try:
        biz_id = None
        if role == "business":
            biz = s.query(Business).filter_by(name=business_name).first()
            if biz is None:
                biz = Business(name=business_name or f"biz-{email}")
                s.add(biz)
                s.flush()
            biz_id = biz.id
        s.add(User(email=email, password_hash=hash_password(password),
                   role=role, business_id=biz_id))
        s.commit()
    finally:
        s.close()


def login_headers(client, email, password=PASSWORD):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def authed(client, role="inspector", email=None, business_name="Acme"):
    """Seed + log in; returns (headers, email). Direct DB seed = test bootstrap."""
    email = email or f"{role}-{business_name}@test.local"
    seed_user(email, role, business_name=business_name if role == "business" else "")
    return login_headers(client, email), email
