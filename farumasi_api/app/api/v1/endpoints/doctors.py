from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.doctor import DoctorProfile
from app.schemas.doctor import DoctorProfileOut, DoctorProfileUpdate
from app.core.exceptions import NotFoundError

router = APIRouter()


async def _get_doctor(user_id: str, db: AsyncSession) -> DoctorProfile:
    result = await db.execute(
        select(DoctorProfile)
        .where(DoctorProfile.user_id == user_id)
        .options(selectinload(DoctorProfile.user))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise NotFoundError("Doctor profile")
    return doc


@router.get("/me", response_model=DoctorProfileOut)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _get_doctor(current_user.id, db)


@router.put("/me", response_model=DoctorProfileOut)
async def update_my_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    doctor = await _get_doctor(current_user.id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.get("/{doctor_id}", response_model=DoctorProfileOut)
async def get_doctor(doctor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DoctorProfile).where(DoctorProfile.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise NotFoundError("Doctor", doctor_id)
    return doctor


# ── Prescriptions (Phase 4) ──────────────────────────────────────────────
from app.schemas.prescription import PrescriptionOut, PrescriptionCreate  # noqa: E402
from app.schemas.common import PaginatedResponse  # noqa: E402
from app.services.prescription_service import PrescriptionService  # noqa: E402
from fastapi import Query  # noqa: E402


@router.get("/me/prescriptions", response_model=PaginatedResponse[PrescriptionOut])
async def list_my_prescriptions(
    status: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await PrescriptionService(db).list_for_doctor(
        current_user, status=status, offset=offset, limit=limit
    )
    return PaginatedResponse(items=list(items), total=total, offset=offset, limit=limit)


@router.post("/me/prescriptions", response_model=PrescriptionOut, status_code=201)
async def create_my_prescription(
    data: PrescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await PrescriptionService(db).create_prescription(data, current_user)
