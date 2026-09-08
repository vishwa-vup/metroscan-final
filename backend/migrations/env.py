"""Alembic environment: URL always comes from app settings (never the ini)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic import context  # noqa: E402

from app.core_config import get_settings  # noqa: E402
from app.db.models import Base  # noqa: E402

config = context.config
target_metadata = Base.metadata


def run_migrations_online() -> None:
    from sqlalchemy import create_engine

    url = get_settings().database_url
    kwargs = {}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(url, **kwargs)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
