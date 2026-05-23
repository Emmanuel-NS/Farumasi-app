"""add pharmacist specialization bio years_of_experience

Revision ID: a1b2c3d4e5f6
Revises: d0c5af55d9d1
Create Date: 2026-05-22

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'd0c5af55d9d1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('pharmacist_profiles', sa.Column('specialization', sa.String(255), nullable=True))
    op.add_column('pharmacist_profiles', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('pharmacist_profiles', sa.Column('years_of_experience', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('pharmacist_profiles', 'years_of_experience')
    op.drop_column('pharmacist_profiles', 'bio')
    op.drop_column('pharmacist_profiles', 'specialization')
