"""change_image_url_to_text

Revision ID: 317d8167e335
Revises: f2a3c4d5e6f7
Create Date: 2026-05-29 17:12:28.906682

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '317d8167e335'
down_revision: Union[str, None] = 'f2a3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('product_catalogue_items', 'image_url',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('product_catalogue_items', 'image_url',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=500),
               existing_nullable=True)
