"""add_prescription_insurance

Adds insurance_provider and insurance_discount_pct to digital_prescriptions.

Revision ID: e3f4a5b6c7d8
Revises: d1e2f3a4b5c6
Create Date: 2026-06-03 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import OperationalError

revision = 'e3f4a5b6c7d8'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    for col, type_ in [
        ("insurance_provider", sa.String(200)),
        ("insurance_discount_pct", sa.Float()),
    ]:
        try:
            op.add_column(
                "digital_prescriptions",
                sa.Column(col, type_, nullable=True),
            )
        except OperationalError:
            pass  # column already exists


def downgrade() -> None:
    for col in ["insurance_provider", "insurance_discount_pct"]:
        try:
            op.drop_column("digital_prescriptions", col)
        except OperationalError:
            pass
