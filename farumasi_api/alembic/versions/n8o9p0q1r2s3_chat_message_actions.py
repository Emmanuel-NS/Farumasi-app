"""chat message reply, edit, soft delete

Revision ID: n8o9p0q1r2s3
Revises: m7n8o9p0q1r2
"""
from alembic import op
import sqlalchemy as sa

revision = "n8o9p0q1r2s3"
down_revision = "m7n8o9p0q1r2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_messages",
        sa.Column("reply_to_message_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_chat_messages_reply_to",
        "chat_messages",
        "chat_messages",
        ["reply_to_message_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_chat_messages_reply_to",
        "chat_messages",
        ["reply_to_message_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_reply_to", table_name="chat_messages")
    op.drop_constraint("fk_chat_messages_reply_to", "chat_messages", type_="foreignkey")
    op.drop_column("chat_messages", "deleted_at")
    op.drop_column("chat_messages", "edited_at")
    op.drop_column("chat_messages", "reply_to_message_id")
