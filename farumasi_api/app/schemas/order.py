from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import computed_field, field_validator, model_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import OrderStatus, PaymentStatus, DeliveryMethod, SellMode, normalize_order_status

class OrderItemCreate(FarumasiBaseModel):
    """Input item for order creation.

    Preferred shape: ``product_listing_id`` + ``quantity`` — server reads
    price and product name from the listing (trusted).

    Legacy shape: ``product_name`` + ``unit_price`` (+ optional ``product_id``)
    — accepted for backward compatibility with manual-entry flows that
    pre-date Phase 6's listing-based orders.
    """

    product_listing_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    quantity: int = 1
    sell_mode: SellMode = SellMode.PACK
    unit_price: Optional[float] = None

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v

    @field_validator("unit_price")
    @classmethod
    def price_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @model_validator(mode="after")
    def _require_listing_or_legacy(self) -> "OrderItemCreate":
        has_listing = bool(self.product_listing_id)
        has_legacy = bool(self.product_name) and self.unit_price is not None
        if not has_listing and not has_legacy:
            raise ValueError(
                "Each item must provide either product_listing_id or "
                "(product_name + unit_price)"
            )
        return self


class OrderCreate(FarumasiBaseModel):
    """Create an order via one of three paths.

    1. Recommendation path: ``prescription_id`` + ``selected_recommendation_id``.
       Items are derived from the prescription and the listings owned by the
       selected pharmacy/partner.
    2. Listing-based manual path: ``items[*].product_listing_id``.
       Pharmacy / partner are derived from the listings (all must share owner).
    3. Legacy manual path: ``items[*].product_name + unit_price`` plus a
       client-provided ``pharmacy_id`` or ``partner_company_id``.
       Kept for backward compatibility — not recommended.
    """

    prescription_id: Optional[str] = None
    selected_recommendation_id: Optional[str] = None
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    delivery_method: DeliveryMethod = DeliveryMethod.DELIVERY
    delivery_address: Optional[str] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    items: Optional[List[OrderItemCreate]] = None
    # Ignored if sent — patient_access_code is generated automatically at order creation.
    patient_access_code: Optional[str] = None
    notes: Optional[str] = None
    defer_delivery_fee: bool = False

    @model_validator(mode="after")
    def _require_one_path(self) -> "OrderCreate":
        has_rec = bool(self.selected_recommendation_id)
        has_items = bool(self.items)
        if has_rec and has_items:
            raise ValueError(
                "Provide either selected_recommendation_id or items, not both"
            )
        if not has_rec and not has_items:
            raise ValueError(
                "Provide selected_recommendation_id (with prescription_id) or items"
            )
        if has_rec and not self.prescription_id:
            raise ValueError(
                "prescription_id is required when selected_recommendation_id is set"
            )
        return self


class OrderItemOut(FarumasiBaseModel):
    id: str
    order_id: str
    product_listing_id: Optional[str] = None
    product_id: Optional[str] = None
    product_name: str
    product_image_url: Optional[str] = None
    quantity: int
    sell_mode: str = "pack"
    unit_price: float
    total_price: float
    dispatch_batch_number: Optional[str] = None
    dispatch_expiry_date: Optional[datetime] = None
    dispatch_manufacturer: Optional[str] = None
    dispatch_country_of_origin: Optional[str] = None
    dispatch_dosage: Optional[str] = None
    dispatch_notes: Optional[str] = None
    dispatch_confirmed_at: Optional[datetime] = None
    created_at: datetime


# ── Nested brief schemas for order responses ──────────────────────────────────

class OrderPharmacyBrief(FarumasiBaseModel):
    id: str
    name: str
    address: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OrderPartnerBrief(FarumasiBaseModel):
    id: str
    name: str
    address: Optional[str] = None
    district: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None


class OrderUserBrief(FarumasiBaseModel):
    id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


class OrderPatientBrief(FarumasiBaseModel):
    id: str
    user: Optional[OrderUserBrief] = None


class OrderRiderBrief(FarumasiBaseModel):
    id: str
    user: Optional[OrderUserBrief] = None


class OrderDeliveryBrief(FarumasiBaseModel):
    id: str
    status: str
    rider: Optional[OrderRiderBrief] = None


class OrderOut(FarumasiBaseModel):
    id: str
    order_code: str
    patient_id: str
    prescription_id: Optional[str] = None
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    previous_pharmacy_id: Optional[str] = None
    previous_partner_company_id: Optional[str] = None
    selected_recommendation_id: Optional[str] = None
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
    payment_method: Optional[str] = None
    payment_phone: Optional[str] = None
    defer_delivery_fee: bool = False
    amount_paid_order: float = 0
    items: List[OrderItemOut] = []
    # Nested relationship data — populated when relationships are loaded
    patient: Optional[OrderPatientBrief] = None
    pharmacy: Optional[OrderPharmacyBrief] = None
    partner_company: Optional[OrderPartnerBrief] = None
    delivery: Optional[OrderDeliveryBrief] = None
    # Access codes — patient_access_code only visible to the patient who placed
    # the order and to Farumasi pharmacists. rider_access_code only visible to
    # the assigned rider and Farumasi pharmacists.
    patient_access_code: Optional[str] = None
    rider_access_code: Optional[str] = None
    notes: Optional[str] = None
    pharmacy_assigned_at: Optional[datetime] = None
    pharmacy_confirmed_at: Optional[datetime] = None
    partner_response_due_at: Optional[datetime] = None
    amount_paid_snapshot: Optional[float] = None
    reassignment_count: int = 0
    dispatch_confirmed_at: Optional[datetime] = None
    partner_fulfilled_at: Optional[datetime] = None
    physical_prescription_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    requires_physical_prescription: bool = False

    @computed_field  # type: ignore[prop-decorator]
    @property
    def partner_fulfilment_complete(self) -> bool:
        return self.partner_fulfilled_at is not None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def platform_fulfilment_complete(self) -> bool:
        return normalize_order_status(self.order_status) == OrderStatus.COMPLETED.value

    @computed_field  # type: ignore[prop-decorator]
    @property
    def can_reassign_pharmacy(self) -> bool:
        if self.payment_status not in (PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID):
            return False
        if normalize_order_status(self.order_status) != OrderStatus.PENDING.value:
            return False
        if self.pharmacy_confirmed_at is not None:
            return False
        if self.partner_response_due_at is None:
            return False
        now = datetime.now(timezone.utc)
        due = self.partner_response_due_at
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return now >= due

    @field_validator("order_status", mode="before")
    @classmethod
    def normalize_order_status_out(cls, v: object) -> object:
        if isinstance(v, str):
            return normalize_order_status(v)
        return v

    @field_validator("partner_response_due_at", mode="after")
    @classmethod
    def hide_partner_deadline_until_paid(cls, v: Optional[datetime], info) -> Optional[datetime]:
        payment_status = info.data.get("payment_status")
        if payment_status not in (PaymentStatus.PAID, PaymentStatus.PARTIALLY_PAID):
            return None
        return v


class OrderStatusUpdate(FarumasiBaseModel):
    order_status: OrderStatus
    notes: Optional[str] = None

    @field_validator("order_status", mode="before")
    @classmethod
    def normalize_order_status_in(cls, v: object) -> object:
        if isinstance(v, str):
            return normalize_order_status(v)
        return v


class PaymentStatusUpdate(FarumasiBaseModel):
    payment_status: PaymentStatus
    payment_reference: Optional[str] = None


class SetRiderAccessCodeRequest(FarumasiBaseModel):
    """Pharmacist sets a rider access code on a delivery order."""
    rider_access_code: str


class VerifyAccessCodeRequest(FarumasiBaseModel):
    """Verify the patient's access code at pickup or delivery completion."""
    access_code: str
    physical_prescription_present: bool = False


class ConfirmRiderHandoverRequest(FarumasiBaseModel):
    """Partner releases medicines to a FARUMASI rider at the pharmacy."""
    rider_access_code: str
    patient_access_code: str


class DispatchItemRecord(FarumasiBaseModel):
    """Per-line dispatch traceability when medicine leaves the partner."""
    order_item_id: str
    batch_number: str
    expiry_date: datetime
    manufacturer: str
    country_of_origin: str
    dosage: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("batch_number", "manufacturer", "country_of_origin")
    @classmethod
    def _non_empty(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("Field is required")
        return v


class ConfirmDispatchRequest(FarumasiBaseModel):
    """Partner records batch traceability and marks order ready for handover."""
    items: List[DispatchItemRecord]

    @model_validator(mode="after")
    def _require_items(self) -> "ConfirmDispatchRequest":
        if not self.items:
            raise ValueError("At least one dispatch item record is required")
        return self


class ReassignmentOptionOut(FarumasiBaseModel):
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    provider_name: str
    estimated_subtotal: float
    delivery_fee: float
    estimated_total: float
    amount_paid: float
    # Legacy fields — below_paid uses requires_no_change_ack semantics (no refund issued).
    requires_refund: bool = False
    refund_amount: float = 0.0
    price_category: str = "within_paid"  # within_paid | below_paid | above_paid
    can_switch: bool = True
    requires_no_change_ack: bool = False
    forfeit_amount: float = 0.0
    extra_payment_required: float = 0.0
    ai_rank: Optional[int] = None
    ai_score: Optional[float] = None
    ai_reasons: List[str] = []


class ReassignmentOptionsOut(FarumasiBaseModel):
    order_id: str
    amount_paid: float
    can_reassign: bool
    switch_enabled: bool = False
    partner_response_due_at: Optional[datetime] = None
    below_paid_count: int = 0
    options: List[ReassignmentOptionOut] = []


class ReassignPharmacyRequest(FarumasiBaseModel):
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    accept_refund_for_difference: bool = False
    accept_no_change: bool = False

    @model_validator(mode="after")
    def _require_provider(self) -> "ReassignPharmacyRequest":
        if not self.pharmacy_id and not self.partner_company_id:
            raise ValueError("pharmacy_id or partner_company_id is required")
        if self.pharmacy_id and self.partner_company_id:
            raise ValueError("Provide only one of pharmacy_id or partner_company_id")
        return self


class OrderActivityEntry(FarumasiBaseModel):
    id: str
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    created_at: datetime
    actor_user_id: Optional[str] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None


class OrderPartnerAssignmentOut(FarumasiBaseModel):
    """Partner pharmacy assignment ledger row for transparency (switches, earnings)."""

    id: str
    order_id: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    provider_name: str
    subtotal: float
    net_partner_amount: float
    assigned_at: datetime
    ended_at: Optional[datetime] = None
    end_reason: Optional[str] = None
    is_current: bool = False
