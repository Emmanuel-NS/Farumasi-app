"""add access codes to orders

Revision ID: a1b2c3d4e5f6
Revises: f2a3c4d5e6f7
Create Date: 2026-05-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Patient sets this secret word at checkout — required to complete pickup/delivery
    op.add_column('orders', sa.Column('patient_access_code', sa.String(length=100), nullable=True))
    # Farumasi pharmacist generates this for the rider — rider presents at pharmacy pickup
    op.add_column('orders', sa.Column('rider_access_code', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('orders', 'rider_access_code')
    op.drop_column('orders', 'patient_access_code')
