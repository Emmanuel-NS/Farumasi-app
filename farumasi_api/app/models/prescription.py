from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import PrescriptionType, PrescriptionStatus, ReviewStatus

if TYPE_CHECKING:
    from app.models.patient import PatientProfile
    from app.models.doctor import DoctorProfile
    from app.models.hospital import Hospital
    from app.models.product import ProductCatalogueItem
    from app.models.pharmacist import PharmacistProfile
    from app.models.recommendation import PharmacyRecommendation


class DigitalPrescription(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "digital_prescriptions"

    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True
    )
    hospital_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True
    )
    prescription_type: Mapped[str] = mapped_column(
        String(50), default=PrescriptionType.PATIENT_UPLOADED
    )
    status: Mapped[str] = mapped_column(String(50), default=PrescriptionStatus.ACTIVE)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diagnosis_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    uploaded_file_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    qr_code: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Insurance coverage added by pharmacist during prescription review
    insurance_provider: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    insurance_discount_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    valid_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # False for soft/digital-only prescriptions (e.g. RSSB) — no physical paper to collect at delivery
    requires_physical_collection: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    patient: Mapped["PatientProfile"] = relationship(
        "PatientProfile", back_populates="prescriptions"
    )
    doctor: Mapped[Optional["DoctorProfile"]] = relationship(
        "DoctorProfile", back_populates="prescriptions"
    )
    hospital: Mapped[Optional["Hospital"]] = relationship(
        "Hospital", back_populates="prescriptions"
    )
    items: Mapped[List["PrescriptionItem"]] = relationship(
        "PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan"
    )
    reviews: Mapped[List["PrescriptionReview"]] = relationship(
        "PrescriptionReview", back_populates="prescription"
    )
    recommendations: Mapped[List["PharmacyRecommendation"]] = relationship(
        "PharmacyRecommendation", back_populates="prescription"
    )

    def __repr__(self) -> str:
        return f"<DigitalPrescription id={self.id} type={self.prescription_type}>"


class PrescriptionItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_items"

    prescription_id: Mapped[str] = mapped_column(
        ForeignKey("digital_prescriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("product_catalogue_items.id", ondelete="SET NULL"), nullable=True
    )
    medicine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    frequency: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    quantity: Mapped[Optional[int]] = mapped_column(default=1)
    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    substitution_allowed: Mapped[bool] = mapped_column(Boolean, default=True)

    prescription: Mapped["DigitalPrescription"] = relationship(
        "DigitalPrescription", back_populates="items"
    )
    product: Mapped[Optional["ProductCatalogueItem"]] = relationship(
        "ProductCatalogueItem", back_populates="prescription_items"
    )

    def __repr__(self) -> str:
        return f"<PrescriptionItem {self.medicine_name}>"


class PrescriptionReview(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "prescription_reviews"

    prescription_id: Mapped[str] = mapped_column(
        ForeignKey("digital_prescriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacist_id: Mapped[str] = mapped_column(
        ForeignKey("pharmacist_profiles.id", ondelete="CASCADE"), nullable=False
    )
    review_status: Mapped[str] = mapped_column(String(50), default=ReviewStatus.PENDING)
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    safety_flags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    prescription: Mapped["DigitalPrescription"] = relationship(
        "DigitalPrescription", back_populates="reviews"
    )
    pharmacist: Mapped["PharmacistProfile"] = relationship(
        "PharmacistProfile", back_populates="prescription_reviews"
    )

    def __repr__(self) -> str:
        return f"<PrescriptionReview prescription_id={self.prescription_id}>"
