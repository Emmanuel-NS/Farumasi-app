"""Add owner payout profiles and email verification challenges."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "h2i3j4k5l6m7"
down_revision = "g1h2i3j4k5l6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "owner_payout_profiles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("owner_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payout_method", sa.String(length=50), nullable=False),
        sa.Column("payout_details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_owner_payout_profiles_owner_user_id", "owner_payout_profiles", ["owner_user_id"], unique=True)

    op.create_table(
        "email_verification_challenges",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(length=80), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_email_verification_challenges_user_id", "email_verification_challenges", ["user_id"])
    op.create_index("ix_email_verification_challenges_purpose", "email_verification_challenges", ["purpose"])


def downgrade() -> None:
    op.drop_index("ix_email_verification_challenges_purpose", table_name="email_verification_challenges")
    op.drop_index("ix_email_verification_challenges_user_id", table_name="email_verification_challenges")
    op.drop_table("email_verification_challenges")
    op.drop_index("ix_owner_payout_profiles_owner_user_id", table_name="owner_payout_profiles")
    op.drop_table("owner_payout_profiles")
