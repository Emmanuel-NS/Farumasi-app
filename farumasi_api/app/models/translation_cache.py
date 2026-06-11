from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TranslationCache(Base, UUIDMixin, TimestampMixin):
    """Persistent cache for machine-translated strings (avoids repeat API charges)."""

    __tablename__ = "translation_cache"
    __table_args__ = (
        UniqueConstraint(
            "source_hash",
            "target_lang",
            "context",
            name="uq_translation_cache_hash_target_context",
        ),
        Index("ix_translation_cache_target_lang", "target_lang"),
    )

    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source_lang: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    target_lang: Mapped[str] = mapped_column(String(10), nullable=False)
    context: Mapped[str] = mapped_column(String(120), nullable=False, default="dynamic")
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    translated_text: Mapped[str] = mapped_column(Text, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="google")
    char_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    hit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class TranslationUsageDaily(Base):
    """Tracks Google Translate character usage per UTC day for budget caps."""

    __tablename__ = "translation_usage_daily"

    usage_date: Mapped[date] = mapped_column(Date, primary_key=True)
    chars_used: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    api_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(nullable=False)
