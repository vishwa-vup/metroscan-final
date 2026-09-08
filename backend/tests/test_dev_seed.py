"""Part D regression tests: dev-only startup seed; never in production; exactly once."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core_config import get_settings  # noqa: E402
from app.db import session as dbs  # noqa: E402
from app.db.dev_seed import seed_dev_admin_once  # noqa: E402
from app.db.models import User  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def emptydb(tmp_path, monkeypatch):
    """Fresh empty sqlite DB + settings reset. Each test must ALSO delete
    PYTEST_CURRENT_TEST in its body (pytest re-sets it per phase, so a
    fixture-scope deletion never survives into the call phase)."""
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path}/seed.db")
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    get_settings.cache_clear()
    dbs.reset_engine()
    yield tmp_path
    dbs.reset_engine()
    get_settings.cache_clear()


def _user_count():
    s = dbs.session_factory()()
    try:
        return s.query(User).count()
    finally:
        s.close()


def test_seed_does_not_fire_in_production(emptydb, monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST")  # run for real; app_env must stop it
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.setenv("JWT_SECRET", "x" * 40)
    get_settings.cache_clear()
    dbs.init_db()  # schema present, zero rows — seed must still refuse
    assert seed_dev_admin_once() is None
    assert _user_count() == 0


def test_dev_startup_seeds_exactly_one_admin_and_login_works(emptydb, monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST")  # let lifespan seed for real
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    get_settings.cache_clear()
    with TestClient(app):
        assert _user_count() == 1
    # Second startup with the same DB must NOT duplicate.
    with TestClient(app):
        assert _user_count() == 1
    c = TestClient(app)
    r = c.post("/api/v1/auth/login",
               json={"email": "admin@local.dev", "password": "changeme-dev-only"})
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "admin"


def test_dev_seed_honors_admin_env_overrides(emptydb, monkeypatch):
    monkeypatch.delenv("PYTEST_CURRENT_TEST")  # run for real
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("ADMIN_EMAIL", "boss@local.dev")
    monkeypatch.setenv("ADMIN_PASSWORD", "Sup3rSecret!")
    get_settings.cache_clear()
    assert seed_dev_admin_once() == "boss@local.dev"
    c = TestClient(app)
    r = c.post("/api/v1/auth/login",
               json={"email": "boss@local.dev", "password": "Sup3rSecret!"})
    assert r.status_code == 200, r.text
