"""Deploy script — run from backend/ after DATABASE_URL is set.

Steps:
1. python deploy/deploy.py
2. npm run build (frontend)
3. docker compose -f deploy/docker-compose.yml up -d --build
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Base  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.auth.passwords import hash_password  # noqa: E402
from alembic.config import Config  # noqa: E402
from alembic import command  # noqa: E402


def run_migrations(database_url: str):
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(alembic_cfg, "head")


def seed_admin(email: str, password: str):
    engine = create_engine(os.environ["DATABASE_URL"])
    Base.metadata.create_all(bind=engine)
    s = SessionLocal()
    try:
        from app.db.models import Business, User  # noqa: F811
        if s.query(User).filter_by(email=email).first():
            print("admin already exists")
            return
        biz = Business(name="Default Business")
        s.add(biz)
        s.flush()
        u = User(email=email, password_hash=hash_password(password),
                  role="admin", business_id=biz.id)
        s.add(u)
        s.commit()
        print(f"admin seeded: {email}")
    finally:
        s.close()


def health_check(url: str):
    import urllib.request
    try:
        r = urllib.request.urlopen(url, timeout=10)
        print(f"healthz: {r.status}")
    except Exception as e:
        print(f"healthz FAIL: {e}")


if __name__ == "__main__":
    db = os.environ["DATABASE_URL"]
    print("=== running migrations ===")
    run_migrations(db)
    print("=== seeding admin ===")
    seed_admin(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"])
    print("=== deploy complete ===")
