from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from app.schemas.common import FarumasiBaseModel


class PatientProfileOut(FarumasiBaseModel):
    id: str
    user_id: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    insurance_provider_id: Optional[str] = None
    insurance_member_number: Optional[str] = None
    financial_status: Optional[str] = None
    default_address_id: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    has_pin: bool = False
    created_at: datetime


class PatientProfileUpdate(FarumasiBaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    insurance_provider_id: Optional[str] = None
    insurance_member_number: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None


class AddressCreate(FarumasiBaseModel):
    label: str
    line1: str
    line2: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False


class AddressUpdate(FarumasiBaseModel):
    label: Optional[str] = None
    line1: Optional[str] = None
    line2: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None


class AddressOut(AddressCreate):
    id: str
    patient_id: str
    created_at: datetime
