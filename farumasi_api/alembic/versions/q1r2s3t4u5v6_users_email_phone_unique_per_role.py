"""allow same email/phone across different user roles

Revision ID: q1r2s3t4u5v6
Revises: p0q1r2s3t4u5
"""
from __future__ import annotations

from alembic import op

revision = "q1r2s3t4u5v6"
down_revision = "p0q1r2s3t4u5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_constraint("users_phone_key", "users", type_="unique")
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("uq_users_email_role", "users", ["email", "role"], unique=True)
    op.execute(
        "CREATE UNIQUE INDEX uq_users_phone_role ON users (phone, role) "
        "WHERE phone IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_phone_role")
    op.drop_index("uq_users_email_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_unique_constraint("users_phone_key", "users", ["phone"])
