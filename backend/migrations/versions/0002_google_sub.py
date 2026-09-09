"""Add users.google_sub (nullable unique) for Google identity linking.

revision = 0002; additive only — safe on populated databases.
Idempotent: 0001 builds fresh schemas from current models (column already
present), so this step adds it only when missing (existing deployments).
"""

revision = "0002"
down_revision = "0001"


def _has_google_sub(bind) -> bool:
    from sqlalchemy import inspect

    return any(c["name"] == "google_sub" for c in inspect(bind).get_columns("users"))


def upgrade() -> None:
    from alembic import op
    import sqlalchemy as sa

    bind = op.get_bind()
    if _has_google_sub(bind):
        return
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("google_sub", sa.String(255), nullable=True))
        batch.create_index("ix_users_google_sub", ["google_sub"], unique=True)


def downgrade() -> None:
    from alembic import op

    bind = op.get_bind()
    if not _has_google_sub(bind):
        return
    with op.batch_alter_table("users") as batch:
        batch.drop_index("ix_users_google_sub")
        batch.drop_column("google_sub")
