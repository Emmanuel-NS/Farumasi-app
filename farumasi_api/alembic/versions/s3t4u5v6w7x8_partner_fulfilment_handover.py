"""Partner fulfilment handover and prescription collection flags

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
"""
from alembic import op
import sqlalchemy as sa

revision = "s3t4u5v6w7x8"
down_revision = "r2s3t4u5v6w7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("partner_fulfilled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("physical_prescription_collected_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "digital_prescriptions",
        sa.Column(
            "requires_physical_collection",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_dosage", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("order_items", "dispatch_notes")
    op.drop_column("order_items", "dispatch_dosage")
    op.drop_column("digital_prescriptions", "requires_physical_collection")
    op.drop_column("orders", "physical_prescription_collected_at")
    op.drop_column("orders", "partner_fulfilled_at")
