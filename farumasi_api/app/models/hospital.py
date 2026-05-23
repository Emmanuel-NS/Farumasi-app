from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import VerificationStatus, EntityStatus

if TYPE_CHECKING:
    from app.models.doctor import DoctorProfile
    from app.models.hospital_admin import HospitalAdminProfile
    from app.models.prescription import DigitalPrescription


class Hospital(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hospitals"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hospital_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=EntityStatus.ACTIVE)
    verification_status: Mapped[str] = mapped_column(
        String(50), default=VerificationStatus.UNVERIFIED
    )
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    departments: Mapped[List["Department"]] = relationship(
        "Department", back_populates="hospital", cascade="all, delete-orphan"
    )
    doctors: Mapped[List["DoctorProfile"]] = relationship(
        "DoctorProfile", back_populates="hospital", foreign_keys="DoctorProfile.hospital_id"
    )
    admins: Mapped[List["HospitalAdminProfile"]] = relationship(
        "HospitalAdminProfile", back_populates="hospital", cascade="all, delete-orphan"
    )
    prescriptions: Mapped[List["DigitalPrescription"]] = relationship(
        "DigitalPrescription", back_populates="hospital"
    )

    def __repr__(self) -> str:
        return f"<Hospital {self.name}>"


class Department(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "departments"

    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    head_doctor_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True
    )

    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="departments")
    head_doctor: Mapped[Optional["DoctorProfile"]] = relationship(
        "DoctorProfile", foreign_keys=[head_doctor_id], uselist=False
    )

    def __repr__(self) -> str:
        return f"<Department {self.name}>"
