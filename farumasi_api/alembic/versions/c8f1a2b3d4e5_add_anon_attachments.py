"""add anonymous + attachments to consultations/messages

Revision ID: c8f1a2b3d4e5
Revises: 3e4bafd4598b
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c8f1a2b3d4e5"
down_revision: Union[str, None] = "3e4bafd4598b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Anonymous mode on consultations
    op.add_column(
        "consultations",
        sa.Column(
            "is_anonymous",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(
        "ix_consultations_anon",
        "consultations",
        ["patient_id", "pharmacist_id", "is_anonymous", "status"],
    )

    # Attachments on chat_messages
    op.add_column(
        "chat_messages",
        sa.Column("attachment_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("attachment_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("attachment_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("attachment_size", sa.Integer(), nullable=True),
    )
    # Allow empty content when an attachment is present
    op.alter_column("chat_messages", "content", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("chat_messages", "content", existing_type=sa.Text(), nullable=False)
    op.drop_column("chat_messages", "attachment_size")
    op.drop_column("chat_messages", "attachment_type")
    op.drop_column("chat_messages", "attachment_name")
    op.drop_column("chat_messages", "attachment_url")
    op.drop_index("ix_consultations_anon", table_name="consultations")
    op.drop_column("consultations", "is_anonymous")
