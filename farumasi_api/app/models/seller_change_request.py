from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.partner import PartnerCompany
    from app.models.pharmacy import Pharmacy
    from app.models.user import User


class SellerChangeRequest(Base, UUIDMixin, TimestampMixin):
    """Partner must approve admin-proposed seller profile changes (e.g. commission)."""

    __tablename__ = "seller_change_requests"

    seller_type: Mapped[str] = mapped_column(String(50), nullable=False)
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=True, index=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="CASCADE"), nullable=True, index=True
    )
    owner_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requested_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    current_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    proposed_value: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    partner_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_user_id])
    requested_by: Mapped["User"] = relationship("User", foreign_keys=[requested_by_user_id])
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship("PartnerCompany")
