from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import PrescriptionType, PrescriptionStatus, ReviewStatus


class PrescriptionItemCreate(FarumasiBaseModel):
    product_id: Optional[str] = None
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: int = 1
    instructions: Optional[str] = None
    substitution_allowed: bool = True


class PrescriptionItemOut(FarumasiBaseModel):
    id: str
    prescription_id: str
    product_id: Optional[str] = None
    medicine_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    quantity: int
    instructions: Optional[str] = None
    substitution_allowed: bool
    created_at: datetime


class PrescriptionCreate(FarumasiBaseModel):
    patient_id: str
    prescription_type: PrescriptionType = PrescriptionType.DOCTOR_CREATED
    notes: Optional[str] = None
    diagnosis_notes: Optional[str] = None
    items: List[PrescriptionItemCreate] = []


class PrescriptionUploadCreate(FarumasiBaseModel):
    """Patient uploads a scanned/photo prescription."""
    uploaded_file_url: str
    notes: Optional[str] = None


class PrescriptionStatusUpdate(FarumasiBaseModel):
    status: PrescriptionStatus


class PrescriptionUpdate(FarumasiBaseModel):
    notes: Optional[str] = None
    diagnosis_notes: Optional[str] = None
    status: Optional[PrescriptionStatus] = None


class PatientUserOut(FarumasiBaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None


class PatientSummaryOut(FarumasiBaseModel):
    id: str
    user: Optional[PatientUserOut] = None


class PrescriptionOut(FarumasiBaseModel):
    id: str
    patient_id: str
    doctor_id: Optional[str] = None
    hospital_id: Optional[str] = None
    prescription_type: str
    status: str
    notes: Optional[str] = None
    diagnosis_notes: Optional[str] = None
    uploaded_file_url: Optional[str] = None
    qr_code: Optional[str] = None
    items: List[PrescriptionItemOut] = []
    patient: Optional[PatientSummaryOut] = None
    created_at: datetime


class PrescriptionReviewCreate(FarumasiBaseModel):
    prescription_id: str
    review_status: ReviewStatus
    review_notes: Optional[str] = None
    safety_flags: Optional[List[str]] = None


class PrescriptionReviewOut(FarumasiBaseModel):
    id: str
    prescription_id: str
    pharmacist_id: str
    review_status: str
    review_notes: Optional[str] = None
    safety_flags: Optional[List[str]] = None
    created_at: datetime
