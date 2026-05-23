from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import VerificationStatus, EntityStatus


class DoctorProfileOut(FarumasiBaseModel):
    id: str
    user_id: str
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    verification_status: str
    status: str
    created_at: datetime


class DoctorCreate(FarumasiBaseModel):
    user_id: str
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    specialty: Optional[str] = None
    license_number: Optional[str] = None


class DoctorUpdate(FarumasiBaseModel):
    hospital_id: Optional[str] = None
    department_id: Optional[str] = None
    specialty: Optional[str] = None
    license_number: Optional[str] = None


class DoctorStatusUpdate(FarumasiBaseModel):
    status: EntityStatus
    verification_status: Optional[VerificationStatus] = None


# Aliases used by endpoints
DoctorProfileUpdate = DoctorUpdate
