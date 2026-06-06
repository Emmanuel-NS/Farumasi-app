from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import RevenueStatus, WithdrawalStatus

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany
    from app.models.user import User


class RevenueRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "revenue_records"

    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    partner_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pharmacy | partner_company
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )
    gross_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    platform_commission: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    net_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=RevenueStatus.PENDING)

    # ── Relationships ─────────────────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="revenue_record")
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy", back_populates="revenue_records")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="revenue_records"
    )

    def __repr__(self) -> str:
        return f"<RevenueRecord order_id={self.order_id} net={self.net_amount}>"


class WithdrawalRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "withdrawal_requests"

    requester_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    payout_method: Mapped[str] = mapped_column(String(100), nullable=False)
    payout_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=WithdrawalStatus.PENDING)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    processed_by_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    payment_proof_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_user_id])
    processed_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[processed_by_user_id]
    )
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy", back_populates="withdrawal_requests")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="withdrawal_requests"
    )

    def __repr__(self) -> str:
        return f"<WithdrawalRequest {self.amount} status={self.status}>"
