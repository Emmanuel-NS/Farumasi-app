from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.rider import RiderProfile
from app.schemas.rider import RiderProfileOut, RiderProfileUpdate, RiderAvailabilityUpdate
from app.core.exceptions import NotFoundError

router = APIRouter()


@router.get("/me", response_model=RiderProfileOut)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiderProfile).where(RiderProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Rider profile")
    return profile


@router.put("/me", response_model=RiderProfileOut)
async def update_my_profile(
    data: RiderProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RiderProfile).where(RiderProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Rider profile")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.patch("/me/availability", response_model=RiderProfileOut)
async def set_availability(
    data: RiderAvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RiderProfile).where(RiderProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Rider profile")
    profile.availability_status = data.availability_status
    await db.commit()
    await db.refresh(profile)
    return profile
