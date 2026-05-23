from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import VerificationStatus, EntityStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.hospital import Hospital, Department
    from app.models.prescription import DigitalPrescription


class DoctorProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "doctor_profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    hospital_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    department_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    specialty: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(50), default=VerificationStatus.UNVERIFIED
    )
    status: Mapped[str] = mapped_column(String(50), default=EntityStatus.ACTIVE)

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")
    hospital: Mapped[Optional["Hospital"]] = relationship(
        "Hospital", back_populates="doctors", foreign_keys=[hospital_id]
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", foreign_keys=[department_id]
    )
    prescriptions: Mapped[List["DigitalPrescription"]] = relationship(
        "DigitalPrescription", back_populates="doctor"
    )

    def __repr__(self) -> str:
        return f"<DoctorProfile user_id={self.user_id}>"
