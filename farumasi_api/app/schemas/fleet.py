from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel


class PharmacyDriverOut(FarumasiBaseModel):
    """A rider who has performed deliveries for this pharmacy."""
    rider_id: str
    user_id: str
    full_name: str
    phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    assigned_area: Optional[str] = None
    availability_status: str
    verification_status: str
    deliveries_count: int
    completed_count: int
    last_delivery_at: Optional[datetime] = None
