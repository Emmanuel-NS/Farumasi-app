"""add partner regulatory license fields

Revision ID: p0q1r2s3t4u5
Revises: o9p0q1r2s3t4
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "p0q1r2s3t4u5"
down_revision = "o9p0q1r2s3t4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "partner_companies",
        sa.Column("regulatory_authority", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "partner_companies",
        sa.Column("regulatory_license_number", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "partner_companies",
        sa.Column("regulatory_license_document_url", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("partner_companies", "regulatory_license_document_url")
    op.drop_column("partner_companies", "regulatory_license_number")
    op.drop_column("partner_companies", "regulatory_authority")
