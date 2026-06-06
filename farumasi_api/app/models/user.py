from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import UserRole, UserStatus

if TYPE_CHECKING:
    from app.models.patient import PatientProfile
    from app.models.doctor import DoctorProfile
    from app.models.pharmacist import PharmacistProfile
    from app.models.rider import RiderProfile
    from app.models.hospital_admin import HospitalAdminProfile
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany
    from app.models.notification import Notification
    from app.models.audit import AuditLog
    from app.models.consultation import Consultation


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default=UserRole.PATIENT)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=UserStatus.PENDING_VERIFICATION
    )
    profile_image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Settings / verification / lifecycle ───────────────────────────────
    notification_prefs: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    session_invalidated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    patient_profile: Mapped[Optional["PatientProfile"]] = relationship(
        "PatientProfile", back_populates="user", uselist=False
    )
    doctor_profile: Mapped[Optional["DoctorProfile"]] = relationship(
        "DoctorProfile", back_populates="user", uselist=False
    )
    pharmacist_profile: Mapped[Optional["PharmacistProfile"]] = relationship(
        "PharmacistProfile", back_populates="user", uselist=False
    )
    rider_profile: Mapped[Optional["RiderProfile"]] = relationship(
        "RiderProfile", back_populates="user", uselist=False
    )
    hospital_admin_profile: Mapped[Optional["HospitalAdminProfile"]] = relationship(
        "HospitalAdminProfile", back_populates="user", uselist=False
    )
    owned_pharmacies: Mapped[List["Pharmacy"]] = relationship(
        "Pharmacy", back_populates="owner", foreign_keys="Pharmacy.owner_user_id"
    )
    owned_partner_companies: Mapped[List["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="owner", foreign_keys="PartnerCompany.owner_user_id"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user"
    )
    audit_logs: Mapped[List["AuditLog"]] = relationship(
        "AuditLog", back_populates="actor", foreign_keys="AuditLog.actor_user_id"
    )
    consultations_as_patient: Mapped[List["Consultation"]] = relationship(
        "Consultation", back_populates="patient", foreign_keys="Consultation.patient_id"
    )
    consultations_as_pharmacist: Mapped[List["Consultation"]] = relationship(
        "Consultation", back_populates="pharmacist", foreign_keys="Consultation.pharmacist_id"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"
