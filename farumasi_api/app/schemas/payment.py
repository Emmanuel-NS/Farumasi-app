from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel


class MomoPaymentInitiate(FarumasiBaseModel):
    phone: str


class PaymentStatusOut(FarumasiBaseModel):
    order_id: str
    payment_status: str
    amount_due: float
    amount_paid: Optional[float] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    message: Optional[str] = None


class PaymentInitiateOut(FarumasiBaseModel):
    order_id: str
    payment_status: str
    amount: float
    currency: str = "RWF"
    provider: str
    external_id: Optional[str] = None
    message: str
