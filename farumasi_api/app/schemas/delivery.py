from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import DeliveryStatus


class DeliveryOut(FarumasiBaseModel):
    id: str
    order_id: str
    rider_id: Optional[str] = None
    pickup_address: Optional[str] = None
    destination_address: Optional[str] = None
    status: str
    delivery_fee: float
    rider_earning: float
    accepted_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    elapsed_seconds: Optional[int] = None
    qr_token: Optional[str] = None
    qr_confirmed_at: Optional[datetime] = None
    created_at: datetime


class DeliveryStatusUpdate(FarumasiBaseModel):
    status: DeliveryStatus
    notes: Optional[str] = None


class QRConfirmRequest(FarumasiBaseModel):
    qr_token: str


class DeliveryAssignRequest(FarumasiBaseModel):
    order_id: str
    rider_id: Optional[str] = None  # None = auto-assign
    delivery_fee: float = 0
    rider_earning: float = 0
