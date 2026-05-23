from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel


class NotificationOut(FarumasiBaseModel):
    id: str
    user_id: str
    title: str
    message: str
    category: Optional[str] = None
    read_status: bool
    action_url: Optional[str] = None
    created_at: datetime


class PharmacyCreate(FarumasiBaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    accepts_delivery: bool = True


class PharmacyUpdate(FarumasiBaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accepts_delivery: Optional[bool] = None


class PharmacyOut(FarumasiBaseModel):
    id: str
    owner_user_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    verification_status: str
    status: str
    accepts_delivery: bool
    is_open: bool
    created_at: datetime


class PartnerCompanyCreate(FarumasiBaseModel):
    name: str
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None


class PartnerCompanyOut(FarumasiBaseModel):
    id: str
    owner_user_id: str
    name: str
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    verification_status: str
    status: str
    created_at: datetime
