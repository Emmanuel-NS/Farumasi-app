from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import VerificationStatus, EntityStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.product import ProductListing
    from app.models.order import Order
    from app.models.revenue import RevenueRecord
    from app.models.revenue import WithdrawalRequest


class PartnerCompany(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "partner_companies"

    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(50), default=VerificationStatus.UNVERIFIED
    )
    status: Mapped[str] = mapped_column(String(50), default=EntityStatus.ACTIVE)
    business_registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    commission_rate_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    owner: Mapped["User"] = relationship(
        "User", back_populates="owned_partner_companies", foreign_keys=[owner_user_id]
    )
    product_listings: Mapped[List["ProductListing"]] = relationship(
        "ProductListing", back_populates="partner_company"
    )
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="partner_company")
    revenue_records: Mapped[List["RevenueRecord"]] = relationship(
        "RevenueRecord", back_populates="partner_company"
    )
    withdrawal_requests: Mapped[List["WithdrawalRequest"]] = relationship(
        "WithdrawalRequest", back_populates="partner_company"
    )

    def __repr__(self) -> str:
        return f"<PartnerCompany {self.name}>"
