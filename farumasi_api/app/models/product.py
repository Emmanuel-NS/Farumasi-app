from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import (
    ProductType,
    ProductApprovalStatus,
    ProductRequestStatus,
    ListingAvailability,
    EntityStatus,
    PARTIAL_SELLING_CLASSES,
)

if TYPE_CHECKING:
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany
    from app.models.pharmacist import PharmacistProfile
    from app.models.user import User
    from app.models.prescription import PrescriptionItem
    from app.models.order import OrderItem


class ProductCatalogueItem(Base, UUIDMixin, TimestampMixin):
    """Central FARUMASI approved product catalogue."""

    __tablename__ = "product_catalogue_items"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    generic_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    product_type: Mapped[str] = mapped_column(String(50), default=ProductType.MEDICINE)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dosage_form: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    strength: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country_of_origin: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    information_source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prescription_required: Mapped[bool] = mapped_column(Boolean, default=False)
    regulatory_status: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    approval_status: Mapped[str] = mapped_column(
        String(50), default=ProductApprovalStatus.PENDING_REVIEW
    )
    approved_by_pharmacist_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacist_profiles.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Partial / packaging ───────────────────────────────────────────────
    packaging_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    units_per_pack: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    min_partial_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    partial_unit_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    @property
    def allows_partial_selling(self) -> bool:
        """Derived from packaging_class — no extra DB column needed."""
        if not self.packaging_class:
            return False
        allowed = {
            (c.value if hasattr(c, "value") else str(c))
            for c in PARTIAL_SELLING_CLASSES
        }
        return str(self.packaging_class) in allowed

    # ── Relationships ─────────────────────────────────────────────────────
    approved_by_pharmacist: Mapped[Optional["PharmacistProfile"]] = relationship(
        "PharmacistProfile",
        back_populates="approved_products",
        foreign_keys=[approved_by_pharmacist_id],
    )
    created_by: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[created_by_user_id]
    )
    listings: Mapped[List["ProductListing"]] = relationship(
        "ProductListing", back_populates="product"
    )
    prescription_items: Mapped[List["PrescriptionItem"]] = relationship(
        "PrescriptionItem", back_populates="product"
    )

    def __repr__(self) -> str:
        return f"<ProductCatalogueItem {self.name}>"


class ProductListing(Base, UUIDMixin, TimestampMixin):
    """Product listed by a pharmacy or partner company."""

    __tablename__ = "product_listings"

    product_id: Mapped[str] = mapped_column(
        ForeignKey("product_catalogue_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=True, index=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="CASCADE"), nullable=True, index=True
    )
    price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    unit_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(default=0)
    availability_status: Mapped[str] = mapped_column(
        String(50), default=ListingAvailability.AVAILABLE
    )
    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    batch_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    accepted_insurance_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    delivery_options: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    fulfillment_time_minutes: Mapped[int] = mapped_column(default=60)
    location_latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    location_longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=EntityStatus.ACTIVE)

    # ── Relationships ─────────────────────────────────────────────────────
    product: Mapped["ProductCatalogueItem"] = relationship(
        "ProductCatalogueItem", back_populates="listings"
    )
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship(
        "Pharmacy", back_populates="product_listings"
    )
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="product_listings"
    )
    order_items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="product_listing"
    )

    def __repr__(self) -> str:
        return f"<ProductListing product_id={self.product_id}>"


class ProductRequest(Base, UUIDMixin, TimestampMixin):
    """Submitted by pharmacy/partner when product is missing from catalogue."""

    __tablename__ = "product_requests"

    requester_user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    requester_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pharmacy | partner
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_type: Mapped[str] = mapped_column(String(50), default=ProductType.MEDICINE)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    intended_use: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proposed_price: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    documents_urls: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), default=ProductRequestStatus.DRAFT
    )
    review_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by_pharmacist_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacist_profiles.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_user_id])
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship("PartnerCompany")
    reviewed_by: Mapped[Optional["PharmacistProfile"]] = relationship(
        "PharmacistProfile", foreign_keys=[reviewed_by_pharmacist_id]
    )

    def __repr__(self) -> str:
        return f"<ProductRequest {self.product_name}>"


class ProductCategory(Base, UUIDMixin, TimestampMixin):
    """Pharmacist-managed product categories with icon metadata.

    Acts as the single source of truth for category names + icons across all
    portals. Pharmacists create/edit/delete; patients read.
    """

    __tablename__ = "product_categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    icon_name: Mapped[str] = mapped_column(String(60), nullable=False, default="general")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(default=0)

    def __repr__(self) -> str:
        return f"<ProductCategory {self.name}>"
