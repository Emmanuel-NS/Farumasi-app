from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import ArticleStatus

if TYPE_CHECKING:
    from app.models.pharmacist import PharmacistProfile


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
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=ArticleStatus.DRAFT)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    author_pharmacist: Mapped[Optional["PharmacistProfile"]] = relationship(
        "PharmacistProfile", back_populates="articles"
    )

    def __repr__(self) -> str:
        return f"<HealthArticle {self.title}>"
