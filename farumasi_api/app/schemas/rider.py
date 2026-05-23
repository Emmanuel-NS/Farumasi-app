from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.core.constants import RiderAvailability, RiderType


class RiderProfileUpdate(BaseModel):
    rider_type: Optional[RiderType] = None
    vehicle_type: Optional[str] = None
    assigned_area: Optional[str] = None
    payout_method: Optional[str] = None


class RiderAvailabilityUpdate(BaseModel):
    availability_status: RiderAvailability


class RiderProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    rider_type: str
    vehicle_type: Optional[str] = None
    assigned_area: Optional[str] = None
    availability_status: str
    verification_status: str
    payout_method: Optional[str] = None
