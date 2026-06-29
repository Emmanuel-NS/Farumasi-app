from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import ContentPageStatus
from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class ContentPage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_pages"
    __table_args__ = (
        UniqueConstraint("slug", "audience", name="uq_content_pages_slug_audience"),
    )

    slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    page_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    audience: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default=ContentPageStatus.PUBLISHED, nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    contact_meta: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_by_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    updated_by: Mapped[Optional["User"]] = relationship("User", lazy="joined")
    notifications: Mapped[list["ContentPageNotification"]] = relationship(
        "ContentPageNotification", back_populates="content_page"
    )


class ContentPageNotification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_page_notifications"

    content_page_id: Mapped[str] = mapped_column(
        ForeignKey("content_pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sent_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recipient_user_ids: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    roles_filter: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)
    recipient_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    email_sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    in_app_sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    content_page: Mapped["ContentPage"] = relationship("ContentPage", back_populates="notifications")
