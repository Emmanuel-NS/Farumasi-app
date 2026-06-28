"""Track seller drafts by admin user (not pharmacist)

Revision ID: v6w7x8y9z0a1
Revises: u5v6w7x8y9z0
"""
from alembic import op
import sqlalchemy as sa

revision = "v6w7x8y9z0a1"
down_revision = "u5v6w7x8y9z0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pharmacies",
        sa.Column("drafted_by_user_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_pharmacies_drafted_by_user",
        "pharmacies",
        "users",
        ["drafted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_pharmacies_drafted_by_user_id", "pharmacies", ["drafted_by_user_id"])

    op.add_column(
        "partner_companies",
        sa.Column("drafted_by_user_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_partner_companies_drafted_by_user",
        "partner_companies",
        "users",
        ["drafted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_partner_companies_drafted_by_user_id",
        "partner_companies",
        ["drafted_by_user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_partner_companies_drafted_by_user_id", "partner_companies")
    op.drop_constraint("fk_partner_companies_drafted_by_user", "partner_companies", type_="foreignkey")
    op.drop_column("partner_companies", "drafted_by_user_id")

    op.drop_index("ix_pharmacies_drafted_by_user_id", "pharmacies")
    op.drop_constraint("fk_pharmacies_drafted_by_user", "pharmacies", type_="foreignkey")
    op.drop_column("pharmacies", "drafted_by_user_id")
