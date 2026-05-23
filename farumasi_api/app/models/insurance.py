from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.models.pharmacy import pharmacy_insurance

if TYPE_CHECKING:
    from app.models.pharmacy import Pharmacy
    from app.models.patient import PatientProfile


class InsuranceProvider(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "insurance_providers"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    insurance_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")

    # ── Relationships ─────────────────────────────────────────────────────
    pharmacies: Mapped[List["Pharmacy"]] = relationship(
        "Pharmacy", secondary=pharmacy_insurance, back_populates="accepted_insurances"
    )
    patients: Mapped[List["PatientProfile"]] = relationship(
        "PatientProfile", back_populates="insurance_provider"
    )

    def __repr__(self) -> str:
        return f"<InsuranceProvider {self.name}>"
