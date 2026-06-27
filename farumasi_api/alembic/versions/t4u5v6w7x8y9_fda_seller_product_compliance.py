"""FDA seller/product compliance — dispatch country, PIL source, pharmacy onboarding

Revision ID: t4u5v6w7x8y9
Revises: s3t4u5v6w7x8
"""
from alembic import op
import sqlalchemy as sa

revision = "t4u5v6w7x8y9"
down_revision = "s3t4u5v6w7x8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_catalogue_items",
        sa.Column("information_source_url", sa.Text(), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_country_of_origin", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "pharmacies",
        sa.Column("license_document_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "pharmacies",
        sa.Column("supervising_pharmacist_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "pharmacies",
        sa.Column("supervising_pharmacist_license", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "pharmacies",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "pharmacies",
        sa.Column("drafted_by_pharmacist_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_pharmacies_drafted_by_pharmacist",
        "pharmacies",
        "pharmacist_profiles",
        ["drafted_by_pharmacist_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "partner_companies",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "partner_companies",
        sa.Column("drafted_by_pharmacist_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_partner_companies_drafted_by_pharmacist",
        "partner_companies",
        "pharmacist_profiles",
        ["drafted_by_pharmacist_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        "UPDATE pharmacies SET onboarding_completed = true "
        "WHERE verification_status = 'verified'"
    )
    op.execute(
        "UPDATE partner_companies SET onboarding_completed = true "
        "WHERE verification_status = 'verified'"
    )


def downgrade() -> None:
    op.drop_constraint("fk_partner_companies_drafted_by_pharmacist", "partner_companies", type_="foreignkey")
    op.drop_column("partner_companies", "drafted_by_pharmacist_id")
    op.drop_column("partner_companies", "onboarding_completed")
    op.drop_constraint("fk_pharmacies_drafted_by_pharmacist", "pharmacies", type_="foreignkey")
    op.drop_column("pharmacies", "drafted_by_pharmacist_id")
    op.drop_column("pharmacies", "onboarding_completed")
    op.drop_column("pharmacies", "supervising_pharmacist_license")
    op.drop_column("pharmacies", "supervising_pharmacist_name")
    op.drop_column("pharmacies", "license_document_url")
    op.drop_column("order_items", "dispatch_country_of_origin")
    op.drop_column("product_catalogue_items", "information_source_url")
