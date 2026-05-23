from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin, require_roles
from app.core.constants import UserRole, EntityStatus
from app.models.user import User
from app.models.hospital import Hospital, Department
from app.models.hospital_admin import HospitalAdminProfile
from app.models.doctor import DoctorProfile
from app.schemas.hospital import (
    HospitalOut, HospitalCreate, HospitalUpdate,
    DepartmentOut, DepartmentCreate,
    HospitalAdminProfileOut,
)
from app.schemas.doctor import DoctorProfileOut, DoctorStatusUpdate
from app.core.exceptions import NotFoundError, AuthorizationError

router = APIRouter()


# ─── helpers ──────────────────────────────────────────────────────────────

async def _get_hospital_or_404(hospital_id: str, db: AsyncSession) -> Hospital:
    result = await db.execute(select(Hospital).where(Hospital.id == hospital_id))
    hospital = result.scalar_one_or_none()
    if not hospital:
        raise NotFoundError("Hospital", hospital_id)
    return hospital


async def _assert_hospital_access(hospital_id: str, current_user: User, db: AsyncSession) -> None:
    """Allow super_admin unrestricted access; hospital_admin only to their own hospital."""
    if current_user.role == UserRole.SUPER_ADMIN:
        return
    result = await db.execute(
        select(HospitalAdminProfile).where(
            HospitalAdminProfile.user_id == current_user.id,
            HospitalAdminProfile.hospital_id == hospital_id,
        )
    )
    if not result.scalar_one_or_none():
        raise AuthorizationError("You are not an admin of this hospital")


# ─── hospital CRUD ────────────────────────────────────────────────────────

@router.post("/", response_model=HospitalOut, status_code=201, dependencies=[Depends(require_super_admin())])
async def create_hospital(data: HospitalCreate, db: AsyncSession = Depends(get_db)):
    hospital = Hospital(**data.model_dump())
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return hospital


@router.get("/", response_model=list[HospitalOut])
async def list_hospitals(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Hospital).offset(offset).limit(limit))
    return list(result.scalars().all())


@router.get("/{hospital_id}", response_model=HospitalOut)
async def get_hospital(hospital_id: str, db: AsyncSession = Depends(get_db)):
    return await _get_hospital_or_404(hospital_id, db)


@router.patch("/{hospital_id}", response_model=HospitalOut)
async def update_hospital(
    hospital_id: str,
    data: HospitalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    hospital = await _get_hospital_or_404(hospital_id, db)
    await _assert_hospital_access(hospital_id, current_user, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(hospital, field, value)
    await db.commit()
    await db.refresh(hospital)
    return hospital


# Keep old PUT for backwards compat — delegates to same logic
@router.put("/{hospital_id}", response_model=HospitalOut, include_in_schema=False)
async def update_hospital_put(
    hospital_id: str,
    data: HospitalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    return await update_hospital(hospital_id, data, db, current_user)


# ─── departments ──────────────────────────────────────────────────────────

@router.post("/{hospital_id}/departments", response_model=DepartmentOut, status_code=201)
async def add_department(
    hospital_id: str,
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    await _get_hospital_or_404(hospital_id, db)
    await _assert_hospital_access(hospital_id, current_user, db)
    dept = Department(hospital_id=hospital_id, **data.model_dump())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept


@router.get("/{hospital_id}/departments", response_model=list[DepartmentOut])
async def list_departments(hospital_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.hospital_id == hospital_id))
    return list(result.scalars().all())


# ─── hospital → doctor management ─────────────────────────────────────────

@router.get("/{hospital_id}/doctors", response_model=list[DoctorProfileOut])
async def list_hospital_doctors(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    await _get_hospital_or_404(hospital_id, db)
    await _assert_hospital_access(hospital_id, current_user, db)
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.hospital_id == hospital_id)
    )
    return list(result.scalars().all())


@router.post("/{hospital_id}/doctors", response_model=DoctorProfileOut, status_code=201)
async def assign_doctor_to_hospital(
    hospital_id: str,
    doctor_user_id: str,
    department_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    """Assign an existing doctor (by their user_id) to this hospital."""
    await _get_hospital_or_404(hospital_id, db)
    await _assert_hospital_access(hospital_id, current_user, db)
    result = await db.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == doctor_user_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise NotFoundError("Doctor profile for user", doctor_user_id)
    doctor.hospital_id = hospital_id
    if department_id is not None:
        doctor.department_id = department_id
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.patch("/{hospital_id}/doctors/{doctor_id}/status", response_model=DoctorProfileOut)
async def update_doctor_status(
    hospital_id: str,
    doctor_id: str,
    data: DoctorStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
):
    await _get_hospital_or_404(hospital_id, db)
    await _assert_hospital_access(hospital_id, current_user, db)
    result = await db.execute(
        select(DoctorProfile).where(
            DoctorProfile.id == doctor_id,
            DoctorProfile.hospital_id == hospital_id,
        )
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise NotFoundError("Doctor", doctor_id)
    doctor.status = data.status
    if data.verification_status is not None:
        doctor.verification_status = data.verification_status
    await db.commit()
    await db.refresh(doctor)
    return doctor


# ─── hospital admin profile management ────────────────────────────────────

@router.get("/{hospital_id}/admins", response_model=list[HospitalAdminProfileOut])
async def list_hospital_admins(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin()),
):
    await _get_hospital_or_404(hospital_id, db)
    result = await db.execute(
        select(HospitalAdminProfile).where(HospitalAdminProfile.hospital_id == hospital_id)
    )
    return list(result.scalars().all())
