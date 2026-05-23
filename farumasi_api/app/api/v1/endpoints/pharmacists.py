from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.pharmacist import PharmacistProfile
from app.schemas.pharmacist import PharmacistProfileOut, PharmacistProfileUpdate, PharmacistPublicOut
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError
from app.core.constants import EntityStatus

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[PharmacistPublicOut])
async def list_pharmacists(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: list active pharmacists with user info for consult page."""
    total_result = await db.execute(
        select(func.count(PharmacistProfile.id)).where(PharmacistProfile.status == EntityStatus.ACTIVE)
    )
    total = total_result.scalar_one()
    result = await db.execute(
        select(PharmacistProfile)
        .where(PharmacistProfile.status == EntityStatus.ACTIVE)
        .options(selectinload(PharmacistProfile.user))
        .offset(offset)
        .limit(limit)
    )
    profiles = list(result.scalars().all())
    return PaginatedResponse(items=profiles, total=total, offset=offset, limit=limit)


@router.get("/me", response_model=PharmacistProfileOut)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PharmacistProfile)
        .where(PharmacistProfile.user_id == current_user.id)
        .options(selectinload(PharmacistProfile.user))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Pharmacist profile")
    return profile


@router.put("/me", response_model=PharmacistProfileOut)
async def update_my_profile(
    data: PharmacistProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PharmacistProfile).where(PharmacistProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Pharmacist profile")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile
