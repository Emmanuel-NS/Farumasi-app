"""Manual MoMo order payments with proof upload and admin review

Revision ID: w7x8y9z0a1b2
Revises: v6w7x8y9z0a1
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "w7x8y9z0a1b2"
down_revision = "v6w7x8y9z0a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "payment_transactions",
        sa.Column("proof_urls", JSONB, nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("patient_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("admin_review_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column("reviewed_by_user_id", sa.String(), nullable=True),
    )
    op.add_column(
        "payment_transactions",
        sa.Column(
            "confirmed_momo_transaction_id",
            sa.String(length=120),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_payment_transactions_reviewed_by_user",
        "payment_transactions",
        "users",
        ["reviewed_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_payment_transactions_confirmed_momo_txn_id",
        "payment_transactions",
        ["confirmed_momo_transaction_id"],
        unique=True,
    )
    op.create_index(
        "ix_payment_transactions_status",
        "payment_transactions",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_payment_transactions_status", "payment_transactions")
    op.drop_index("ix_payment_transactions_confirmed_momo_txn_id", "payment_transactions")
    op.drop_constraint(
        "fk_payment_transactions_reviewed_by_user",
        "payment_transactions",
        type_="foreignkey",
    )
    op.drop_column("payment_transactions", "confirmed_momo_transaction_id")
    op.drop_column("payment_transactions", "reviewed_by_user_id")
    op.drop_column("payment_transactions", "reviewed_at")
    op.drop_column("payment_transactions", "submitted_at")
    op.drop_column("payment_transactions", "admin_review_note")
    op.drop_column("payment_transactions", "patient_note")
    op.drop_column("payment_transactions", "proof_urls")
