"""add pharmacist availability_status

Revision ID: d9a2c4f1e7b6
Revises: c8f1a2b3d4e5
Create Date: 2026-05-27

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d9a2c4f1e7b6"
down_revision = "c8f1a2b3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pharmacist_profiles",
        sa.Column(
            "availability_status",
            sa.String(length=20),
            nullable=False,
            server_default="offline",
        ),
    )


def downgrade() -> None:
    op.drop_column("pharmacist_profiles", "availability_status")
