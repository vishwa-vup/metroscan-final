"""One-shot DB init + admin seed for production (§25).

Usage (from backend/):
  DATABASE_URL=postgresql+psycopg2://u:p@host:5432/metroscan \
  ADMIN_EMAIL=admin@shop.com ADMIN_PASSWORD=Strong!Pass123 \
    python deploy/init_db.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.models import Base  # noqa: E402
from app.db.session import session_factory, get_engine  # noqa: E402
from app.auth.passwords import hash_password  # noqa: E402


def init_db(engine):
    Base.metadata.create_all(bind=engine)


def seed_admin(email: str, password: str):
    s: Session = session_factory()()
    try:
        from app.db.models import Business, User  # noqa: F811
        existing = s.query(User).filter_by(email=email).first()
        if existing:
            print(f"admin already exists: {email}")
            return existing
        biz = Business(name="Default Business")
        s.add(biz)
        s.flush()
        user = User(email=email, password_hash=hash_password(password),
                    role="admin", business_id=biz.id)
        s.add(user)
        s.commit()
        print(f"admin seeded: {email}")
        return user
    finally:
        s.close()


if __name__ == "__main__":
    url = os.environ["DATABASE_URL"]
    engine = create_engine(url)
    init_db(engine)
    seed_admin(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"])
    print("OK — DB ready")
