from __future__ import annotations

from typing import Optional

from app.schemas.common import FarumasiBaseModel


class FlutterwavePaymentInitiate(FarumasiBaseModel):
    phone: str = ""
    email: Optional[str] = None
    name: Optional[str] = None
    redirect_url: Optional[str] = None
    payment_method: str = "mtn_momo"  # mtn_momo | airtel_money | card


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
