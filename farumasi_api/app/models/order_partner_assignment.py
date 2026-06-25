from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany


class OrderPartnerAssignment(Base, UUIDMixin, TimestampMixin):
    """Tracks which partner held an order and expected earnings at each stage."""

    __tablename__ = "order_partner_assignments"

    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    platform_commission: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    net_partner_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_reason: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    order: Mapped["Order"] = relationship("Order", back_populates="partner_assignments")
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship("PartnerCompany")

    def __repr__(self) -> str:
        return (
            f"<OrderPartnerAssignment order_id={self.order_id} "
            f"net={self.net_partner_amount} reason={self.end_reason}>"
        )
