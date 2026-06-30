"""Partial order payments and manual approval outcomes

Revision ID: y0z1a2b3c4d5
Revises: x8y9z0a1b2c3
"""
from alembic import op
import sqlalchemy as sa

revision = "y0z1a2b3c4d5"
down_revision = "x8y9z0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("amount_paid_order", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("expected_order_amount", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("order_amount_applied", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("processing_fee_amount", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("approval_outcome", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payment_transactions", "approval_outcome")
    op.drop_column("payment_transactions", "processing_fee_amount")
    op.drop_column("payment_transactions", "order_amount_applied")
    op.drop_column("payment_transactions", "expected_order_amount")
    op.drop_column("orders", "amount_paid_order")
