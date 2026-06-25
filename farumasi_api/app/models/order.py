from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
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
    from app.models.order_partner_assignment import OrderPartnerAssignment
    from app.models.payment_transaction import PaymentTransaction


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
    payment_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    defer_delivery_fee: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Access codes
    patient_access_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    rider_access_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Customer notes
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Partner response SLA (FDA accountability)
    pharmacy_assigned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    pharmacy_confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    partner_response_due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    amount_paid_snapshot: Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    previous_pharmacy_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("pharmacies.id", ondelete="SET NULL"), nullable=True
    )
    previous_partner_company_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("partner_companies.id", ondelete="SET NULL"), nullable=True
    )
    reassignment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dispatch_confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────
    patient: Mapped["PatientProfile"] = relationship("PatientProfile", back_populates="orders")
    prescription: Mapped[Optional["DigitalPrescription"]] = relationship("DigitalPrescription")
    pharmacy: Mapped[Optional["Pharmacy"]] = relationship(
        "Pharmacy", back_populates="orders", foreign_keys=[pharmacy_id]
    )
    partner_company: Mapped[Optional["PartnerCompany"]] = relationship(
        "PartnerCompany", back_populates="orders", foreign_keys=[partner_company_id]
    )
    recommendation: Mapped[Optional["PharmacyRecommendation"]] = relationship("PharmacyRecommendation")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )
    delivery: Mapped[Optional["Delivery"]] = relationship("Delivery", back_populates="order", uselist=False)
    revenue_record: Mapped[Optional["RevenueRecord"]] = relationship(
        "RevenueRecord", back_populates="order", uselist=False
    )
    partner_assignments: Mapped[List["OrderPartnerAssignment"]] = relationship(
        "OrderPartnerAssignment", back_populates="order", cascade="all, delete-orphan"
    )
    payment_transactions: Mapped[List["PaymentTransaction"]] = relationship(
        "PaymentTransaction", back_populates="order", cascade="all, delete-orphan"
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
    sell_mode: Mapped[str] = mapped_column(String(20), default="pack", nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    # FDA dispatch traceability — recorded when medicine leaves the partner
    dispatch_batch_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dispatch_expiry_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dispatch_manufacturer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    dispatch_confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expiry_alert_30d_sent: Mapped[bool] = mapped_column(default=False, nullable=False)
    expiry_alert_7d_sent: Mapped[bool] = mapped_column(default=False, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    order: Mapped["Order"] = relationship("Order", back_populates="items")
    product_listing: Mapped[Optional["ProductListing"]] = relationship(
        "ProductListing", back_populates="order_items"
    )
    product: Mapped[Optional["ProductCatalogueItem"]] = relationship("ProductCatalogueItem")

    @property
    def product_image_url(self) -> Optional[str]:
        return self.product.image_url if self.product else None

    def __repr__(self) -> str:
        return f"<OrderItem {self.product_name} x{self.quantity}>"
