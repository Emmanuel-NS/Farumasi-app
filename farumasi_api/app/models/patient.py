from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, ForeignKey, JSON, Numeric, String, Text, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.prescription import DigitalPrescription
    from app.models.order import Order
    from app.models.insurance import InsuranceProvider


class Address(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "addresses"

    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Home", "Work"
    line1: Mapped[str] = mapped_column(String(255), nullable=False)
    line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="addresses")


class PatientProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "patient_profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    date_of_birth: Mapped[Optional[Date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    insurance_provider_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("insurance_providers.id", ondelete="SET NULL"), nullable=True
    )
    insurance_member_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    financial_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # placeholder
    default_address_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    emergency_contact: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    allergies: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    chronic_conditions: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="patient_profile")
    insurance_provider: Mapped[Optional["InsuranceProvider"]] = relationship(
        "InsuranceProvider", back_populates="patients"
    )
    prescriptions: Mapped[List["DigitalPrescription"]] = relationship(
        "DigitalPrescription", back_populates="patient"
    )
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="patient")
    addresses: Mapped[List["Address"]] = relationship(
        "Address", back_populates="patient", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PatientProfile user_id={self.user_id}>"
