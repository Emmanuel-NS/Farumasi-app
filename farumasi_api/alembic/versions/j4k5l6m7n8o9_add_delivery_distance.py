"""add estimated_distance_km to deliveries

Revision ID: j4k5l6m7n8o9
Revises: 3b27fe08c6be
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa

revision = 'j4k5l6m7n8o9'
down_revision = '3b27fe08c6be'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'deliveries',
        sa.Column('estimated_distance_km', sa.Numeric(8, 2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('deliveries', 'estimated_distance_km')
