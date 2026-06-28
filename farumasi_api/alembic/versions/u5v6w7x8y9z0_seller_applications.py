"""Seller applications and nullable seller owners for pharmacist drafts

Revision ID: u5v6w7x8y9z0
Revises: t4u5v6w7x8y9
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "u5v6w7x8y9z0"
down_revision = "t4u5v6w7x8y9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("pharmacies", "owner_user_id", existing_type=sa.String(), nullable=True)
    op.alter_column("partner_companies", "owner_user_id", existing_type=sa.String(), nullable=True)

    op.create_table(
        "seller_applications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("application_code", sa.String(length=32), nullable=False),
        sa.Column("seller_type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="submitted"),
        sa.Column("source_pharmacy_id", sa.String(), nullable=True),
        sa.Column("source_partner_id", sa.String(), nullable=True),
        sa.Column("applicant_user_id", sa.String(), nullable=True),
        sa.Column("approved_pharmacy_id", sa.String(), nullable=True),
        sa.Column("approved_partner_id", sa.String(), nullable=True),
        sa.Column("business_name", sa.String(length=255), nullable=False),
        sa.Column("owner_full_name", sa.String(length=255), nullable=False),
        sa.Column("owner_email", sa.String(length=255), nullable=False),
        sa.Column("owner_phone", sa.String(length=30), nullable=True),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("payload", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["source_pharmacy_id"], ["pharmacies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_partner_id"], ["partner_companies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["applicant_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["approved_pharmacy_id"], ["pharmacies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["approved_partner_id"], ["partner_companies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_code"),
    )
    op.create_index("ix_seller_applications_seller_type", "seller_applications", ["seller_type"])
    op.create_index("ix_seller_applications_status", "seller_applications", ["status"])
    op.create_index("ix_seller_applications_owner_email", "seller_applications", ["owner_email"])


def downgrade() -> None:
    op.drop_table("seller_applications")
    op.alter_column("partner_companies", "owner_user_id", existing_type=sa.String(), nullable=False)
    op.alter_column("pharmacies", "owner_user_id", existing_type=sa.String(), nullable=False)
