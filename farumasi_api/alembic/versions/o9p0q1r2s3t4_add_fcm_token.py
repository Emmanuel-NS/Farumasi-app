"""add fcm token columns to users

Revision ID: o9p0q1r2s3t4
Revises: n8o9p0q1r2s3
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "o9p0q1r2s3t4"
down_revision = "n8o9p0q1r2s3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("fcm_token", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("fcm_platform", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "fcm_platform")
    op.drop_column("users", "fcm_token")
