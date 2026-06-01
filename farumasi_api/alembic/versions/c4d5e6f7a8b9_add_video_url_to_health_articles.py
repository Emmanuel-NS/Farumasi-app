"""add_video_url_to_health_articles

Revision ID: c4d5e6f7a8b9
Revises: 3b27fe08c6be
Create Date: 2026-06-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c4d5e6f7a8b9'
down_revision = '3b27fe08c6be'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('health_articles', sa.Column('video_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('health_articles', 'video_url')
