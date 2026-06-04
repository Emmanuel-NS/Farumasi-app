from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import ArticleStatus

if TYPE_CHECKING:
    from app.models.pharmacist import PharmacistProfile
    from app.models.user import User


class HealthArticle(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "health_articles"

    author_pharmacist_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacist_profiles.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(500), unique=True, nullable=False, index=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # JSON-encoded list of category names (multi-category). When present, the
    # primary `category` field is also kept in sync to the first entry.
    categories_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Post type: "article" | "tip" | "guide" | "news" | "did_you_know"
    article_type: Mapped[str] = mapped_column(String(40), nullable=False, default="article", server_default="article")
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=ArticleStatus.DRAFT)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Optional YouTube/video URL for the hero section
    video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Aggregated counters (kept in sync by service)
    view_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    like_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    share_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    comment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_sponsored: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    author_pharmacist: Mapped[Optional["PharmacistProfile"]] = relationship(
        "PharmacistProfile", back_populates="articles"
    )

    def __repr__(self) -> str:
        return f"<HealthArticle {self.title}>"


class ArticleLike(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "article_likes"
    __table_args__ = (UniqueConstraint("article_id", "user_id", name="uq_article_likes_article_user"),)

    article_id: Mapped[str] = mapped_column(ForeignKey("health_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)


class ArticleSave(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "article_saves"
    __table_args__ = (UniqueConstraint("article_id", "user_id", name="uq_article_saves_article_user"),)

    article_id: Mapped[str] = mapped_column(ForeignKey("health_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)


class ArticleComment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "article_comments"

    article_id: Mapped[str] = mapped_column(ForeignKey("health_articles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("article_comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", lazy="joined")
