from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PharmacistProfileUpdate(BaseModel):
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None


class UserSnippet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None


class PharmacistProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = None
    verification_status: str
    status: str
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
    user: UserSnippet
