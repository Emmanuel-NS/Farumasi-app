from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PartnerCompanyCreate(BaseModel):
    name: str
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None


class PartnerCompanyUpdate(BaseModel):
    name: Optional[str] = None
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None


class PartnerCompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_user_id: str
    name: str
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None
    verification_status: str
    status: str
    created_at: datetime
