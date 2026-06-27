from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany


class SellerApplication(Base, UUIDMixin, TimestampMixin):
    """Public seller application — kept separate from pharmacist drafts until approved."""

    __tablename__ = "seller_applications"

    application_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    seller_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # pharmacy | partner
    status: Mapped[str] = mapped_column(String(30), default="submitted", index=True)

    source_pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_partner_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True, index=True
    )

    applicant_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    approved_pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    approved_partner_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )

    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    owner_phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    applicant: Mapped[Optional["User"]] = relationship("User", foreign_keys=[applicant_user_id])
    source_pharmacy: Mapped[Optional["Pharmacy"]] = relationship(
        "Pharmacy", foreign_keys=[source_pharmacy_id]
    )
    source_partner: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", foreign_keys=[source_partner_id]
    )
