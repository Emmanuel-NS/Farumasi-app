from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import VerificationStatus, EntityStatus


class HospitalCreate(FarumasiBaseModel):
    name: str
    hospital_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    license_number: Optional[str] = None


class HospitalUpdate(FarumasiBaseModel):
    name: Optional[str] = None
    hospital_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None


class HospitalOut(FarumasiBaseModel):
    id: str
    name: str
    hospital_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    status: str
    verification_status: str
    license_number: Optional[str] = None
    created_at: datetime


class DepartmentCreate(FarumasiBaseModel):
    name: str
    description: Optional[str] = None
    head_doctor_id: Optional[str] = None


class DepartmentOut(FarumasiBaseModel):
    id: str
    hospital_id: str
    name: str
    description: Optional[str] = None
    head_doctor_id: Optional[str] = None
    created_at: datetime


# ── HospitalAdminProfile ──────────────────────────────────────────────────

class HospitalAdminProfileCreate(FarumasiBaseModel):
    hospital_id: str
    position_title: Optional[str] = None


class HospitalAdminProfileOut(FarumasiBaseModel):
    id: str
    user_id: str
    hospital_id: str
    position_title: Optional[str] = None
    created_at: datetime
