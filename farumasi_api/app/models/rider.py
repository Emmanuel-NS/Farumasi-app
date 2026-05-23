from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import RiderType, RiderAvailability, VerificationStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.delivery import Delivery


class RiderProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "rider_profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    rider_type: Mapped[str] = mapped_column(String(50), default=RiderType.PER_TRIP)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_area: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    availability_status: Mapped[str] = mapped_column(
        String(50), default=RiderAvailability.OFFLINE
    )
    verification_status: Mapped[str] = mapped_column(
        String(50), default=VerificationStatus.UNVERIFIED
    )
    payout_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="rider_profile")
    deliveries: Mapped[List["Delivery"]] = relationship("Delivery", back_populates="rider")

    def __repr__(self) -> str:
        return f"<RiderProfile user_id={self.user_id}>"
