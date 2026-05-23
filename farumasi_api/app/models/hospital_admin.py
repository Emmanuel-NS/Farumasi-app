from __future__ import annotations

from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.hospital import Hospital


class HospitalAdminProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "hospital_admin_profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    hospital_id: Mapped[str] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="hospital_admin_profile")
    hospital: Mapped["Hospital"] = relationship("Hospital", back_populates="admins")

    def __repr__(self) -> str:
        return f"<HospitalAdminProfile user_id={self.user_id} hospital_id={self.hospital_id}>"
