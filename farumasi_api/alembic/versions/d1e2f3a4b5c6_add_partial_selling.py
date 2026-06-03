"""add_partial_selling

Adds packaging/partial-selling columns to product_catalogue_items
and unit_price to product_listings.

Revision ID: d1e2f3a4b5c6
Revises: c4d5e6f7a8b9
Create Date: 2026-06-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import OperationalError

revision = 'd1e2f3a4b5c6'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def _add_if_missing(table: str, column: str, col_def: str) -> None:
    """Add column only if it doesn't already exist (idempotent)."""
    conn = op.get_bind()
    res = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    if res.fetchone() is None:
        op.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")


def upgrade() -> None:
    _add_if_missing("product_catalogue_items", "packaging_class", "VARCHAR(50)")
    _add_if_missing("product_catalogue_items", "units_per_pack", "INTEGER")
    _add_if_missing("product_catalogue_items", "min_partial_quantity", "INTEGER")
    _add_if_missing("product_catalogue_items", "partial_unit_name", "VARCHAR(100)")
    _add_if_missing("product_listings", "unit_price", "NUMERIC(12,2)")
    _add_if_missing("order_items", "sell_mode", "VARCHAR(20) NOT NULL DEFAULT 'pack'")


def downgrade() -> None:
    op.drop_column("product_listings", "unit_price")
    op.drop_column("product_catalogue_items", "partial_unit_name")
    op.drop_column("product_catalogue_items", "min_partial_quantity")
    op.drop_column("product_catalogue_items", "units_per_pack")
    op.drop_column("product_catalogue_items", "packaging_class")
