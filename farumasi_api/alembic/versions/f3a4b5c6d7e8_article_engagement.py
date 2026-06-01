"""article engagement: types, multi-category, counters, likes/saves/comments

Revision ID: f3a4b5c6d7e8
Revises: a3b4c5d6e7f8
Create Date: 2026-06-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a4b5c6d7e8"
down_revision: Union[str, None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extend health_articles with type, multi-category and engagement counters
    with op.batch_alter_table("health_articles") as batch:
        batch.add_column(sa.Column("categories_json", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column(
                "article_type",
                sa.String(length=40),
                nullable=False,
                server_default="article",
            )
        )
        batch.add_column(
            sa.Column("view_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("like_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("share_count", sa.Integer(), nullable=False, server_default="0")
        )
        batch.add_column(
            sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0")
        )

    # Likes
    op.create_table(
        "article_likes",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "article_id",
            sa.String(length=36),
            sa.ForeignKey("health_articles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("article_id", "user_id", name="uq_article_likes_article_user"),
    )
    op.create_index("ix_article_likes_article_id", "article_likes", ["article_id"])
    op.create_index("ix_article_likes_user_id", "article_likes", ["user_id"])

    # Saves
    op.create_table(
        "article_saves",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "article_id",
            sa.String(length=36),
            sa.ForeignKey("health_articles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("article_id", "user_id", name="uq_article_saves_article_user"),
    )
    op.create_index("ix_article_saves_article_id", "article_saves", ["article_id"])
    op.create_index("ix_article_saves_user_id", "article_saves", ["user_id"])

    # Comments
    op.create_table(
        "article_comments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "article_id",
            sa.String(length=36),
            sa.ForeignKey("health_articles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            sa.String(length=36),
            sa.ForeignKey("article_comments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_article_comments_article_id", "article_comments", ["article_id"])
    op.create_index("ix_article_comments_user_id", "article_comments", ["user_id"])
    op.create_index("ix_article_comments_parent_id", "article_comments", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_article_comments_parent_id", table_name="article_comments")
    op.drop_index("ix_article_comments_user_id", table_name="article_comments")
    op.drop_index("ix_article_comments_article_id", table_name="article_comments")
    op.drop_table("article_comments")

    op.drop_index("ix_article_saves_user_id", table_name="article_saves")
    op.drop_index("ix_article_saves_article_id", table_name="article_saves")
    op.drop_table("article_saves")

    op.drop_index("ix_article_likes_user_id", table_name="article_likes")
    op.drop_index("ix_article_likes_article_id", table_name="article_likes")
    op.drop_table("article_likes")

    with op.batch_alter_table("health_articles") as batch:
        batch.drop_column("comment_count")
        batch.drop_column("share_count")
        batch.drop_column("like_count")
        batch.drop_column("view_count")
        batch.drop_column("article_type")
        batch.drop_column("categories_json")
