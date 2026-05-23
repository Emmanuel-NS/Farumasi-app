from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PharmacyBase(BaseModel):
    name: str
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None
    is_open: bool = True
    accepts_delivery: bool = False


class PharmacyCreate(PharmacyBase):
    pass


class PharmacyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_open: Optional[bool] = None
    accepts_delivery: Optional[bool] = None


class PharmacyOut(PharmacyBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_user_id: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
