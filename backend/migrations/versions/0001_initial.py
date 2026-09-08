"""Initial schema: all 11 §23 entities.

revision = 0001; creates every table from the models metadata so the migration
and the models can never drift on a fresh database.
"""

revision = "0001"
down_revision = None


def upgrade() -> None:
    from alembic import op

    from app.db.models import Base

    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    from alembic import op

    from app.db.models import Base

    Base.metadata.drop_all(bind=op.get_bind())
