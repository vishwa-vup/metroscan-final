"""Database connection + session lifecycle + health check (§42 session tasks)."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core_config import get_settings
from app.db.models import Base

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        url = get_settings().database_url
        # pool_pre_ping: never hand out a dead connection. pool_recycle: drop
        # connections idle >5min — cloud poolers (Supabase/PgBouncer) evict
        # idle server connections, which otherwise surface as first-use
        # failures after quiet periods. SQLite keeps its plain config.
        kwargs = {"pool_pre_ping": True}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs["pool_recycle"] = 300
        _engine = create_engine(url, **kwargs)
    return _engine


def reset_engine() -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


def session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), expire_on_commit=False)
    return _SessionLocal


def init_db() -> None:
    Base.metadata.create_all(bind=get_engine())


def db_ping() -> bool:
    try:
        with get_engine().connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
