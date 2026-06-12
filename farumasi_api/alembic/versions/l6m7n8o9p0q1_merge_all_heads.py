"""merge all migration heads

Revision ID: l6m7n8o9p0q1
Revises: c8f1a2b3d4e5, e3f4a5b6c7d8, i3j4k5l6m7n8, k5l6m7n8o9p0
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, Sequence[str], None] = (
    "c8f1a2b3d4e5",
    "e3f4a5b6c7d8",
    "i3j4k5l6m7n8",
    "k5l6m7n8o9p0",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
