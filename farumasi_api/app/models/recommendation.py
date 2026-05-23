from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, ForeignKey, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.prescription import DigitalPrescription
    from app.models.patient import PatientProfile
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany


class PharmacyRecommendation(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacy_recommendations"

    prescription_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("digital_prescriptions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )

    # ── Scores (0–100 each) ───────────────────────────────────────────────
    total_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    availability_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    insurance_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    price_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    location_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    delivery_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    reliability_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)
    expiry_safety_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0.0)

    # ── Explainability ────────────────────────────────────────────────────
    reasons: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    warnings: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # ── Summary ───────────────────────────────────────────────────────────
    estimated_total_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    estimated_distance_km: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    can_fulfill_complete_prescription: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Relationships ─────────────────────────────────────────────────────
    prescription: Mapped[Optional["DigitalPrescription"]] = relationship(
        "DigitalPrescription", back_populates="recommendations"
    )
    patient: Mapped["PatientProfile"] = relationship("PatientProfile")
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship("PartnerCompany")

    def __repr__(self) -> str:
        return f"<PharmacyRecommendation score={self.total_score}>"
