from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.order import Order


class PaymentTransaction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payment_transactions"

    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="RWF", nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    method: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    external_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    provider_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="payment_transactions")
