from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict


AvailabilityStatus = Literal["available", "busy", "offline"]


class PharmacistProfileUpdate(BaseModel):
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    availability_status: Optional[AvailabilityStatus] = None


class PharmacistAvailabilityUpdate(BaseModel):
    availability_status: AvailabilityStatus


class UserSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None
    last_login_at: Optional[datetime] = None


class PharmacistProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    pharmacy_id: Optional[str] = None
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    verification_status: str
    status: str
    availability_status: str = "offline"
    created_at: datetime


class PharmacistPublicOut(BaseModel):
    """Minimal pharmacist info for patient-facing consult listings."""
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    specialization: Optional[str] = None
    years_of_experience: Optional[int] = None
    bio: Optional[str] = None
    status: str
    availability_status: str = "offline"
    user: UserSnippet
