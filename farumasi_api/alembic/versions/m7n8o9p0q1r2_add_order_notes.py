"""add order notes column

Revision ID: m7n8o9p0q1r2
Revises: l6m7n8o9p0q1
"""
from alembic import op
import sqlalchemy as sa

revision = "m7n8o9p0q1r2"
down_revision = "l6m7n8o9p0q1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("notes", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "notes")
