from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin
from app.core.constants import OrderStatus, PaymentStatus, DeliveryMethod

if TYPE_CHECKING:
    from app.models.patient import PatientProfile
    from app.models.prescription import DigitalPrescription
    from app.models.pharmacy import Pharmacy
    from app.models.partner import PartnerCompany
    from app.models.recommendation import PharmacyRecommendation
    from app.models.product import ProductListing, ProductCatalogueItem
    from app.models.delivery import Delivery
    from app.models.revenue import RevenueRecord


class Order(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "orders"

    order_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(
        ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prescription_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("digital_prescriptions.id", ondelete="SET NULL"), nullable=True
    )
    pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )
    selected_recommendation_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacy_recommendations.id", ondelete="SET NULL"), nullable=True
    )
    order_status: Mapped[str] = mapped_column(String(50), default=OrderStatus.PENDING)
    payment_status: Mapped[str] = mapped_column(String(50), default=PaymentStatus.UNPAID)
    delivery_method: Mapped[str] = mapped_column(String(50), default=DeliveryMethod.DELIVERY)

    # Delivery address snapshot
    delivery_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    delivery_latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)
    delivery_longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6), nullable=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    delivery_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    platform_commission: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    net_partner_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    # Payment reference (MoMo transaction ID, etc.)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Access codes
    patient_access_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_access_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Customer notes
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="orders")
    prescription: Mapped[Optional["DigitalPrescription"]] = relationship("DigitalPrescription")
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship("Pharmacy", back_populates="orders")
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="orders"
    )
    recommendation: Mapped[Optional["PharmacyRecommendation"]] = relationship("PharmacyRecommendation")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    delivery: Mapped[Optional["Delivery"]] = relationship("Delivery", back_populates="order", uselist=False)
    revenue_record: Mapped[Optional["RevenueRecord"]] = relationship(
        "RevenueRecord", back_populates="order", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Order {self.order_code} status={self.order_status}>"


class OrderItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "order_items"

    order_id: Mapped[str] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_listing_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("product_listings.id", ondelete="SET NULL"), nullable=True
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("product_catalogue_items.id", ondelete="SET NULL"), nullable=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(default=1)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product_listing: Mapped[Optional["ProductListing"]] = relationship(
        "ProductListing", back_populates="order_items"
    )
    product: Mapped[Optional["ProductCatalogueItem"]] = relationship("ProductCatalogueItem")

    def __repr__(self) -> str:
        return f"<OrderItem {self.product_name} x{self.quantity}>"
