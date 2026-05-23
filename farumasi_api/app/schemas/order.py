from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import OrderStatus, PaymentStatus, DeliveryMethod


class OrderItemCreate(FarumasiBaseModel):
    product_listing_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: str
    quantity: int = 1
    unit_price: float

    @field_validator("unit_price")
    @classmethod
    def price_positive(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v


class OrderCreate(FarumasiBaseModel):
    prescription_id: Optional[str] = None
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    selected_recommendation_id: Optional[str] = None
    delivery_method: DeliveryMethod = DeliveryMethod.DELIVERY
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    items: List[OrderItemCreate]

    @field_validator("items")
    @classmethod
    def items_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("Order must have at least one item")
        return v


class OrderItemOut(FarumasiBaseModel):
    id: str
    order_id: str
    product_id: Optional[str] = None
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    created_at: datetime


class OrderOut(FarumasiBaseModel):
    id: str
    order_code: str
    patient_id: str
    prescription_id: Optional[str] = None
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    order_status: str
    payment_status: str
    delivery_method: str
    delivery_address: Optional[str] = None
    subtotal: float
    delivery_fee: float
    platform_commission: float
    total_amount: float
    net_partner_amount: float
    payment_reference: Optional[str] = None
    items: List[OrderItemOut] = []
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(FarumasiBaseModel):
    order_status: OrderStatus
    notes: Optional[str] = None


class PaymentStatusUpdate(FarumasiBaseModel):
    payment_status: PaymentStatus
    payment_reference: Optional[str] = None
