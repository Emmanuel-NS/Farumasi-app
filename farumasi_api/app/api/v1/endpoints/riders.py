from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.constants import UserRole
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.models.user import User
from app.models.rider import RiderProfile
from app.schemas.rider import (
    RiderProfileOut,
    RiderProfileUpdate,
    RiderAvailabilityUpdate,
    RiderEarningsOut,
)
from app.schemas.delivery import (
    DeliveryOut,
    DeliveryRejectRequest,
    DeliveryStatusUpdate,
    QRConfirmRequest,
)
from app.services.delivery_service import DeliveryService
from app.core.exceptions import NotFoundError

router = APIRouter()


async def _get_rider(user_id: str, db: AsyncSession) -> RiderProfile:
    result = await db.execute(
        select(RiderProfile).where(RiderProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Rider profile")
    return profile


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


# ── Phase 7: rider-scoped delivery routes ────────────────────────────────
@router.get("/me/deliveries", response_model=list[DeliveryOut])
async def list_my_deliveries(
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(current_user.id, db)
    return await DeliveryService(db).list_for_rider(rider.id)


@router.get("/me/deliveries/active", response_model=list[DeliveryOut])
async def list_my_active_deliveries(
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(current_user.id, db)
    return await DeliveryService(db).get_active_for_rider(rider.id)


@router.patch("/me/deliveries/{delivery_id}/accept", response_model=DeliveryOut)
async def accept_my_delivery(
    delivery_id: str,
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    return await DeliveryService(db).accept_for_rider(delivery_id, current_user)


@router.patch("/me/deliveries/{delivery_id}/reject", response_model=DeliveryOut)
async def reject_my_delivery(
    delivery_id: str,
    data: DeliveryRejectRequest,
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    return await DeliveryService(db).reject_for_rider(delivery_id, data, current_user)


@router.patch("/me/deliveries/{delivery_id}/status", response_model=DeliveryOut)
async def update_my_delivery_status(
    delivery_id: str,
    data: DeliveryStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    return await DeliveryService(db).update_status_scoped(delivery_id, data, current_user)


@router.post("/me/deliveries/{delivery_id}/confirm-qr", response_model=DeliveryOut)
async def confirm_my_delivery_qr(
    delivery_id: str,
    data: QRConfirmRequest,
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    return await DeliveryService(db).confirm_qr_scoped(delivery_id, data, current_user)


@router.get("/me/earnings", response_model=RiderEarningsOut)
async def my_earnings(
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    rider = await _get_rider(current_user.id, db)
    return await DeliveryService(db).compute_rider_earnings(rider)

