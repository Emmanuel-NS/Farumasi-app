"""link pharmacists to a pharmacy

Revision ID: f2a3c4d5e6f7
Revises: e1b7c3a9d2f1
Create Date: 2026-05-28

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f2a3c4d5e6f7"
down_revision = "e1b7c3a9d2f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pharmacist_profiles",
        sa.Column("pharmacy_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_pharmacist_profiles_pharmacy_id",
        "pharmacist_profiles",
        "pharmacies",
        ["pharmacy_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_pharmacist_profiles_pharmacy_id",
        "pharmacist_profiles",
        ["pharmacy_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_pharmacist_profiles_pharmacy_id", table_name="pharmacist_profiles")
    op.drop_constraint(
        "fk_pharmacist_profiles_pharmacy_id", "pharmacist_profiles", type_="foreignkey"
    )
    op.drop_column("pharmacist_profiles", "pharmacy_id")
