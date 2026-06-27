from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class InsuranceBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str


class PharmacyBase(BaseModel):
    name: str
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None
    license_document_url: Optional[str] = None
    supervising_pharmacist_name: Optional[str] = None
    supervising_pharmacist_license: Optional[str] = None
    is_open: bool = True
    accepts_delivery: bool = False
    logo_url: Optional[str] = None
    commission_rate_percent: Optional[float] = None


class PharmacyCreate(PharmacyBase):
    pass


class PharmacyUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None
    license_document_url: Optional[str] = None
    supervising_pharmacist_name: Optional[str] = None
    supervising_pharmacist_license: Optional[str] = None
    is_open: Optional[bool] = None
    accepts_delivery: Optional[bool] = None


class PharmacyAdminUpdate(PharmacyUpdate):
    """Fields platform admins may set on any pharmacy."""

    verification_status: Optional[str] = None
    status: Optional[str] = None
    commission_rate_percent: Optional[float] = None


class PharmacyOwnerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    full_name: str
    email: str


class PharmacyOut(PharmacyBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    owner_user_id: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: Optional[PharmacyOwnerBrief] = None
    logo_url: Optional[str] = None
    commission_rate_percent: Optional[float] = None
    effective_commission_rate_percent: Optional[float] = None
    commission_rate_source: Optional[str] = None
    onboarding_completed: bool = False
    drafted_by_pharmacist_id: Optional[str] = None
    accepted_insurances: List[InsuranceBrief] = []
