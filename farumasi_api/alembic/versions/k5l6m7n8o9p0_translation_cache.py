"""translation cache and daily usage tables

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-06-10
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "k5l6m7n8o9p0"
down_revision = "j4k5l6m7n8o9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "translation_cache",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("source_lang", sa.String(length=10), nullable=False),
        sa.Column("target_lang", sa.String(length=10), nullable=False),
        sa.Column("context", sa.String(length=120), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("translated_text", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("char_count", sa.Integer(), nullable=False),
        sa.Column("hit_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "source_hash",
            "target_lang",
            "context",
            name="uq_translation_cache_hash_target_context",
        ),
    )
    op.create_index("ix_translation_cache_target_lang", "translation_cache", ["target_lang"])

    op.create_table(
        "translation_usage_daily",
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("chars_used", sa.BigInteger(), nullable=False),
        sa.Column("api_calls", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("usage_date"),
    )


def downgrade() -> None:
    op.drop_table("translation_usage_daily")
    op.drop_index("ix_translation_cache_target_lang", table_name="translation_cache")
    op.drop_table("translation_cache")
