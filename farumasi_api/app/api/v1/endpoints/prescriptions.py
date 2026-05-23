from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.pharmacist import PharmacistProfile
from app.models.prescription import DigitalPrescription
from app.schemas.prescription import (
    PrescriptionOut,
    PrescriptionCreate,
    PrescriptionUploadCreate,
    PrescriptionStatusUpdate,
    PrescriptionItemCreate,
    PrescriptionReviewCreate,
    PrescriptionReviewOut,
)
from app.schemas.common import PaginatedResponse
from app.services.prescription_service import PrescriptionService
from app.core.constants import PrescriptionStatus

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[PrescriptionOut])
async def list_all_prescriptions(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """For pharmacists/doctors/admins: list all prescriptions, optionally filter by status."""
    conditions = []
    if status:
        conditions.append(DigitalPrescription.status == status)
    total = (await db.execute(
        select(func.count(DigitalPrescription.id)).where(*conditions) if conditions
        else select(func.count(DigitalPrescription.id))
    )).scalar_one()
    from sqlalchemy.orm import selectinload
    from app.models.patient import PatientProfile
    from app.models.user import User as UserModel
    q = (
        select(DigitalPrescription)
        .options(
            selectinload(DigitalPrescription.items),
            selectinload(DigitalPrescription.patient).selectinload(PatientProfile.user),
        )
    )
    if conditions:
        q = q.where(*conditions)
    q = q.order_by(DigitalPrescription.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.post("/patient/upload", response_model=PrescriptionOut, status_code=201)
async def patient_upload_prescription(
    data: PrescriptionUploadCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Patient uploads a physical/scanned prescription image."""
    return await PrescriptionService(db).patient_upload(data, actor)


@router.get("/patient/me", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Return all prescriptions for the currently authenticated patient."""
    patient_result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == actor.id)
    )
    patient = patient_result.scalar_one_or_none()
    if not patient:
        return []
    return await PrescriptionService(db).get_patient_prescriptions(patient.id)


@router.post("/", response_model=PrescriptionOut, status_code=201)
async def create_prescription(
    data: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).create_prescription(data, actor)


@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(
    prescription_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await PrescriptionService(db).get_prescription(prescription_id)


@router.patch("/{prescription_id}/status", response_model=PrescriptionOut)
async def update_prescription_status(
    prescription_id: str,
    data: PrescriptionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Pharmacist/doctor can update prescription status."""
    return await PrescriptionService(db).update_status(prescription_id, data.status, actor)


@router.post("/{prescription_id}/items", status_code=201)
async def add_item(
    prescription_id: str,
    data: PrescriptionItemCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).add_item(prescription_id, data, actor)


@router.post("/{prescription_id}/review", response_model=PrescriptionReviewOut, status_code=201)
async def review_prescription(
    prescription_id: str,
    data: PrescriptionReviewCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    result = await db.execute(select(PharmacistProfile).where(PharmacistProfile.user_id == actor.id))
    pharmacist = result.scalar_one_or_none()
    pharmacist_id = pharmacist.id if pharmacist else actor.id
    data.prescription_id = prescription_id
    return await PrescriptionService(db).review_prescription(data, pharmacist_id)


@router.get("/patient/{patient_id}", response_model=list[PrescriptionOut])
async def list_patient_prescriptions(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await PrescriptionService(db).get_patient_prescriptions(patient_id)
