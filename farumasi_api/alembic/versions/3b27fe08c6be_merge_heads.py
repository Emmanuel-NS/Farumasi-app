"""merge_heads

Revision ID: 3b27fe08c6be
Revises: b1c2d3e4f5a6, f3a4b5c6d7e8
Create Date: 2026-06-01 19:52:36.075533

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3b27fe08c6be'
down_revision: Union[str, None] = ('b1c2d3e4f5a6', 'f3a4b5c6d7e8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
