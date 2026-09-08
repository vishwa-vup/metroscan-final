"""One-time development seed (Part D).

Creates tables + a single admin user on application STARTUP, and ONLY when
APP_ENV=development. Structurally impossible in production: the very first
check returns unless app_env is exactly "development". Never called from any
request handler — login (auth.py) must NEVER create users.
"""

import logging
import os

log = logging.getLogger("metroscan.dev_seed")

DEV_ADMIN_EMAIL = "admin@local.dev"
DEV_ADMIN_PASSWORD = "changeme-dev-only"


def seed_dev_admin_once() -> str | None:
    """Create tables + one admin iff dev mode and users table is empty.

    Returns the seeded email, or None when nothing was done. Never raises:
    a dev box without a reachable DB must still start (endpoints 503
    honestly instead).
    """
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None  # tests manage their own fixtures; never seed under pytest
    from app.core_config import get_settings

    if get_settings().app_env.lower() != "development":
        return None  # production (or anything else): structurally excluded
    try:
        from app.auth.passwords import hash_password
        from app.db.models import Base, User
        from app.db.session import get_engine, session_factory

        Base.metadata.create_all(bind=get_engine())
        s = session_factory()()
        try:
            if s.query(User).count() > 0:
                return None  # already seeded — exactly once, no duplicates
            email = os.environ.get("ADMIN_EMAIL") or DEV_ADMIN_EMAIL
            password = os.environ.get("ADMIN_PASSWORD") or DEV_ADMIN_PASSWORD
            s.add(User(email=email, password_hash=hash_password(password),
                       role="admin", business_id=None))
            s.commit()
            log.warning("dev-seed: created admin user %s (development only)", email)
            return email
        finally:
            s.close()
    except Exception as exc:  # noqa: BLE001 — dev convenience, never fatal
        log.warning("dev-seed skipped: %s", type(exc).__name__)
        return None
