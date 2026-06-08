from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class OwnerPayoutProfile(Base, UUIDMixin, TimestampMixin):
    """Registered payout destination for a seller owner (partner / pharmacy admin)."""

    __tablename__ = "owner_payout_profiles"

    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    payout_method: Mapped[str] = mapped_column(String(50), nullable=False)
    payout_details: Mapped[dict] = mapped_column(JSON, nullable=False)

    owner: Mapped["User"] = relationship("User", back_populates="payout_profile")
