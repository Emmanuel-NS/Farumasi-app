from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import model_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import DeliveryStatus, DeliveryRejectionReason


class DeliveryOut(FarumasiBaseModel):
    id: str
    order_id: str
    rider_id: Optional[str] = None

    pickup_address: Optional[str] = None
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None

    destination_address: Optional[str] = None
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None

    status: str
    rejection_reason: Optional[str] = None

    delivery_fee: float
    rider_earning: float
    estimated_distance_km: Optional[float] = None

    accepted_at: Optional[datetime] = None
    pickup_arrived_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivery_started_at: Optional[datetime] = None
    destination_arrived_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    elapsed_seconds: Optional[int] = None

    qr_token: Optional[str] = None
    qr_code: Optional[str] = None
    qr_confirmed_at: Optional[datetime] = None

    created_at: datetime


class DeliveryCreateRequest(FarumasiBaseModel):
    order_id: str
    pickup_address: Optional[str] = None
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    destination_address: Optional[str] = None
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    delivery_fee: Optional[float] = None


class DeliveryStatusUpdate(FarumasiBaseModel):
    status: DeliveryStatus
    notes: Optional[str] = None


class DeliveryAssignRequest(FarumasiBaseModel):
    """Used by PATCH /deliveries/{id}/assign (rider_id only) and by the
    legacy POST /deliveries/assign back-compat alias (also accepts order_id)."""
    rider_id: Optional[str] = None  # None = auto-assign
    order_id: Optional[str] = None  # legacy / back-compat
    delivery_fee: Optional[float] = None
    rider_earning: Optional[float] = None


class DeliveryRejectRequest(FarumasiBaseModel):
    reason: DeliveryRejectionReason
    custom_reason: Optional[str] = None

    @model_validator(mode="after")
    def _require_custom_when_other(self) -> "DeliveryRejectRequest":
        if self.reason == DeliveryRejectionReason.OTHER and not (
            self.custom_reason and self.custom_reason.strip()
        ):
            raise ValueError("custom_reason is required when reason is 'other'")
        return self


class QRConfirmRequest(FarumasiBaseModel):
    qr_token: str


class DeliveryTimerOut(FarumasiBaseModel):
    delivery_id: str
    status: str
    accepted_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    elapsed_seconds: Optional[int] = None
    current_elapsed_seconds: Optional[int] = None


class DeliveryQRForPatient(FarumasiBaseModel):
    delivery_id: str
    order_id: str
    status: str
    qr_token: Optional[str] = None
    qr_code: Optional[str] = None
