"""Add patient payment fields and payment_transactions table."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "i3j4k5l6m7n8"
down_revision = "h2i3j4k5l6m7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("payment_method", sa.String(length=50), nullable=True))
    op.add_column("orders", sa.Column("payment_phone", sa.String(length=20), nullable=True))
    op.add_column(
        "orders",
        sa.Column("defer_delivery_fee", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "payment_transactions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("order_id", sa.String(length=36), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="RWF"),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("method", sa.String(length=50), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending"),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False, unique=True),
        sa.Column("provider_reference", sa.String(length=255), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_payment_transactions_order_id", "payment_transactions", ["order_id"])
    op.create_index("ix_payment_transactions_external_id", "payment_transactions", ["external_id"])


def downgrade() -> None:
    op.drop_index("ix_payment_transactions_external_id", table_name="payment_transactions")
    op.drop_index("ix_payment_transactions_order_id", table_name="payment_transactions")
    op.drop_table("payment_transactions")
    op.drop_column("orders", "defer_delivery_fee")
    op.drop_column("orders", "payment_phone")
    op.drop_column("orders", "payment_method")
