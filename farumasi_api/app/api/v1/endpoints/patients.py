from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile, Address
from app.schemas.patient import PatientProfileOut, PatientProfileUpdate, AddressCreate, AddressOut
from app.core.exceptions import NotFoundError

router = APIRouter()


async def _get_patient(user_id: str, db: AsyncSession) -> PatientProfile:
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient profile")
    return patient


@router.get("/me", response_model=PatientProfileOut)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _get_patient(current_user.id, db)


@router.put("/me", response_model=PatientProfileOut)
async def update_my_profile(
    data: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    await db.flush()
    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/me/addresses", response_model=AddressOut, status_code=201)
async def add_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    if data.is_default:
        # Clear existing default
        existing = await db.execute(select(Address).where(Address.patient_id == patient.id, Address.is_default == True))
        for addr in existing.scalars():
            addr.is_default = False

    address = Address(
        patient_id=patient.id,
        label=data.label,
        line1=data.line1,
        line2=data.line2,
        district=data.district,
        city=data.city,
        latitude=data.latitude,
        longitude=data.longitude,
        is_default=data.is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


@router.get("/me/addresses", response_model=list[AddressOut])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    result = await db.execute(select(Address).where(Address.patient_id == patient.id))
    return list(result.scalars().all())


# ── Prescriptions (Phase 4) ──────────────────────────────────────────────
from app.schemas.prescription import PrescriptionOut, PrescriptionUploadCreate  # noqa: E402
from app.services.prescription_service import PrescriptionService  # noqa: E402


@router.get("/me/prescriptions", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    return await PrescriptionService(db).list_for_patient(patient.id)


@router.post(
    "/me/prescriptions/upload",
    response_model=PrescriptionOut,
    status_code=201,
)
async def upload_my_prescription(
    data: PrescriptionUploadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await PrescriptionService(db).patient_upload(data, current_user)
