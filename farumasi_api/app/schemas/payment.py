from __future__ import annotations

from typing import Optional

from pydantic import Field

from app.schemas.common import FarumasiBaseModel


class FlutterwavePaymentInitiate(FarumasiBaseModel):
    phone: str = ""
    email: Optional[str] = None
    name: Optional[str] = None
    redirect_url: Optional[str] = None
    payment_method: str = "mtn_momo"  # mtn_momo | card


PaymentInitiate = FlutterwavePaymentInitiate


class PaymentInitiateOut(FarumasiBaseModel):
    order_id: str
    payment_status: str
    amount: float
    order_amount: float = 0
    processing_fee: float = 0
    currency: str = "RWF"
    provider: str
    external_id: Optional[str] = None
    checkout_url: Optional[str] = None
    message: str
    payment_method: Optional[str] = None


class PaymentStatusOut(FarumasiBaseModel):
    order_id: str
    payment_status: str
    amount_due: float
    amount_paid: Optional[float] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    message: Optional[str] = None
    processing_fee: Optional[float] = None
    pending_transaction_id: Optional[str] = None
    submitted_at: Optional[str] = None
    subtotal: Optional[float] = None
    delivery_fee: Optional[float] = None
    total_amount: Optional[float] = None
    defer_delivery_fee: bool = False
    amount_paid_order: Optional[float] = None
    balance_due: Optional[float] = None
    delivery_fee_outstanding: Optional[float] = None
    medicines_paid: bool = False
    fully_paid: bool = False
    payable_balance: Optional[float] = None
    processing_fee_on_balance: Optional[float] = None
    charge_amount: Optional[float] = None
    admin_review_note: Optional[str] = None
    can_submit_payment: bool = True
    awaiting_manual_review: bool = False


class ManualPaymentSubmit(FarumasiBaseModel):
    proof_urls: list[str] = Field(min_length=1, max_length=10)
    patient_note: Optional[str] = Field(default=None, max_length=2000)
    claimed_reference: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = None


class OrderPaymentContextOut(FarumasiBaseModel):
    subtotal: float
    delivery_fee: float
    total_amount: float
    defer_delivery_fee: bool
    amount_paid_order: float
    balance_due: float
    delivery_fee_outstanding: float = 0
    medicines_paid: bool = False
    processing_fee_on_balance: float = 0


class ManualPaymentReview(FarumasiBaseModel):
    momo_transaction_id: str = Field(min_length=4, max_length=120)
    review_note: Optional[str] = Field(default=None, max_length=2000)
    outcome: str = Field(default="full", description="full | partial | delivery_deferred")
    amount_received: Optional[float] = Field(
        default=None,
        description="Order value received (excluding processing fee). Required for partial.",
    )


class ManualPaymentReject(FarumasiBaseModel):
    review_note: str = Field(min_length=1, max_length=2000)


class PaymentTransactionOut(FarumasiBaseModel):
    id: str
    order_id: str
    order_code: Optional[str] = None
    amount: float
    currency: str
    provider: str
    method: str
    status: str
    phone: Optional[str] = None
    proof_urls: list[str] = Field(default_factory=list)
    patient_note: Optional[str] = None
    admin_review_note: Optional[str] = None
    patient_name: Optional[str] = None
    patient_email: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_at: Optional[str] = None
    paid_at: Optional[str] = None
    confirmed_momo_transaction_id: Optional[str] = None
    created_at: Optional[str] = None
    expected_order_amount: Optional[float] = None
    order_amount_applied: Optional[float] = None
    processing_fee_amount: Optional[float] = None
    approval_outcome: Optional[str] = None
    order_context: Optional[OrderPaymentContextOut] = None
