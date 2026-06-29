"""Platform content pages (terms, privacy, support, etc.)

Revision ID: x8y9z0a1b2c3
Revises: w7x8y9z0a1b2
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "x8y9z0a1b2c3"
down_revision = "w7x8y9z0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "content_pages",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("page_type", sa.String(length=50), nullable=False),
        sa.Column("audience", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="published"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("contact_meta", JSONB, nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by_user_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", "audience", name="uq_content_pages_slug_audience"),
    )
    op.create_index("ix_content_pages_slug", "content_pages", ["slug"])
    op.create_index("ix_content_pages_page_type", "content_pages", ["page_type"])
    op.create_index("ix_content_pages_audience", "content_pages", ["audience"])
    op.create_index("ix_content_pages_status", "content_pages", ["status"])

    op.create_table(
        "content_page_notifications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("content_page_id", sa.String(), nullable=False),
        sa.Column("sent_by_user_id", sa.String(), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("recipient_user_ids", JSONB, nullable=True),
        sa.Column("roles_filter", JSONB, nullable=True),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("email_sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("in_app_sent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
        sa.ForeignKeyConstraint(["content_page_id"], ["content_pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sent_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_content_page_notifications_page_id",
        "content_page_notifications",
        ["content_page_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_content_page_notifications_page_id", "content_page_notifications")
    op.drop_table("content_page_notifications")
    op.drop_index("ix_content_pages_status", "content_pages")
    op.drop_index("ix_content_pages_audience", "content_pages")
    op.drop_index("ix_content_pages_page_type", "content_pages")
    op.drop_index("ix_content_pages_slug", "content_pages")
    op.drop_table("content_pages")
