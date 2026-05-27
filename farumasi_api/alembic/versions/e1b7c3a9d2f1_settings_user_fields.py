"""add settings-related user fields

Revision ID: e1b7c3a9d2f1
Revises: d9a2c4f1e7b6
Create Date: 2026-05-28

Adds:
- users.notification_prefs JSONB nullable
- users.two_factor_enabled BOOLEAN default false
- users.email_verified BOOLEAN default false
- users.phone_verified BOOLEAN default false
- users.session_invalidated_at TIMESTAMPTZ nullable
- users.deleted_at TIMESTAMPTZ nullable
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "e1b7c3a9d2f1"
down_revision = "d9a2c4f1e7b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("notification_prefs", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("two_factor_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "users",
        sa.Column("session_invalidated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "deleted_at")
    op.drop_column("users", "session_invalidated_at")
    op.drop_column("users", "phone_verified")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "two_factor_enabled")
    op.drop_column("users", "notification_prefs")
