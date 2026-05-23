from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import DeliveryStatus

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.rider import RiderProfile


class Delivery(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "deliveries"

    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    rider_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("rider_profiles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Pickup location (pharmacy / partner)
    pickup_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pickup_latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    pickup_longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)

    # Destination (patient)
    destination_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    destination_latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    destination_longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)

    status: Mapped[str] = mapped_column(String(50), default=DeliveryStatus.PENDING_ASSIGNMENT)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    delivery_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    rider_earning: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # ── Timeline ──────────────────────────────────────────────────────────
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    picked_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    destination_arrived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    elapsed_seconds: Mapped[Optional[int]] = mapped_column(nullable=True)

    # ── QR ────────────────────────────────────────────────────────────────
    qr_code: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    qr_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    qr_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="delivery")
    rider: Mapped[Optional["RiderProfile"]] = relationship(
        "RiderProfile", back_populates="deliveries"
    )

    def __repr__(self) -> str:
        return f"<Delivery order_id={self.order_id} status={self.status}>"
