"""Add partner company profile columns missing from older DBs.

Revision ID: g1h2i3j4k5l6
Revises: e1b7c3a9d2f1
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "g1h2i3j4k5l6"
down_revision = "e1b7c3a9d2f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("partner_companies", sa.Column("logo_url", sa.String(length=500), nullable=True))
    op.add_column("partner_companies", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "partner_companies",
        sa.Column("commission_rate_percent", sa.Numeric(precision=5, scale=2), nullable=True),
    )
    op.add_column(
        "partner_companies",
        sa.Column("is_open", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("partner_companies", "is_open")
    op.drop_column("partner_companies", "commission_rate_percent")
    op.drop_column("partner_companies", "description")
    op.drop_column("partner_companies", "logo_url")
