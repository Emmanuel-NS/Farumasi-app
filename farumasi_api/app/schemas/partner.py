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
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_open: bool = True


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
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_open: Optional[bool] = None


class PartnerCompanyAdminUpdate(PartnerCompanyUpdate):
    """Fields super-admin may set on any partner company."""

    commission_rate_percent: Optional[float] = None
    verification_status: Optional[str] = None
    status: Optional[str] = None


class PartnerCompanyPublicOut(BaseModel):
    """Fields exposed to patients browsing the store (no owner/commission)."""

    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    company_type: Optional[str] = None
    district: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_open: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None


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
    logo_url: Optional[str] = None
    description: Optional[str] = None
    commission_rate_percent: Optional[float] = None
    effective_commission_rate_percent: Optional[float] = None
    commission_rate_source: Optional[str] = None
    is_open: bool = True
    verification_status: str
    status: str
    created_at: datetime
