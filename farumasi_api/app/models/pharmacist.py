from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import VerificationStatus, EntityStatus

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.prescription import PrescriptionReview
    from app.models.article import HealthArticle
    from app.models.product import ProductCatalogueItem


class PharmacistProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "pharmacist_profiles"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(50), default=VerificationStatus.UNVERIFIED
    )
    status: Mapped[str] = mapped_column(String(50), default=EntityStatus.ACTIVE)
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="pharmacist_profile")
    prescription_reviews: Mapped[List["PrescriptionReview"]] = relationship(
        "PrescriptionReview", back_populates="pharmacist"
    )
    articles: Mapped[List["HealthArticle"]] = relationship(
        "HealthArticle", back_populates="author_pharmacist"
    )
    approved_products: Mapped[List["ProductCatalogueItem"]] = relationship(
        "ProductCatalogueItem",
        back_populates="approved_by_pharmacist",
        foreign_keys="ProductCatalogueItem.approved_by_pharmacist_id",
    )

    def __repr__(self) -> str:
        return f"<PharmacistProfile user_id={self.user_id}>"
