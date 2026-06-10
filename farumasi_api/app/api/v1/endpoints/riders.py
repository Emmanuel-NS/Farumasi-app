from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel, field_validator

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
from app.core.exceptions import NotFoundError, ValidationError


class RiderPayoutRequest(BaseModel):
    amount: float
    mobile_number: str
    payment_method: str = "mtn_momo"

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: float) -> float:
        if v < 500:
            raise ValueError("Minimum payout is 500 RWF")
        return round(v, 2)

    @field_validator("mobile_number")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        digits = "".join(c for c in v if c.isdigit())
        if len(digits) < 9:
            raise ValueError("Mobile number must have at least 9 digits")
        return v


class RiderPayoutOut(BaseModel):
    id: str
    status: str
    amount: float
    mobile_number: str
    payment_method: str
    message: str

router = APIRouter()


@router.get(
    "",
    response_model=list[RiderProfileOut],
    summary="List riders (staff only)",
)
async def list_riders(
    available_only: bool = True,
    actor: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.PHARMACIST,
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return a list of riders. Pass ``available_only=false`` to include
    offline riders. Used by pharmacists to pick a rider for delivery assignment."""
    from sqlalchemy.orm import selectinload as _sel
    stmt = select(RiderProfile).options(_sel(RiderProfile.user))
    if available_only:
        stmt = stmt.where(RiderProfile.availability_status == "online")
    result = await db.execute(stmt)
    return result.scalars().all()


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


@router.post("/me/payout-request", response_model=RiderPayoutOut, status_code=201)
async def request_rider_payout(
    data: RiderPayoutRequest,
    current_user: User = Depends(require_roles(UserRole.RIDER)),
    db: AsyncSession = Depends(get_db),
):
    """Submit a payout request for accumulated rider earnings.

    Per-trip riders can request a payout of their pending earnings via
    MTN MoMo or Airtel Money.  The request is queued for finance team approval.
    """
    import uuid as _uuid

    from app.core.constants import WithdrawalStatus
    from app.models.revenue import WithdrawalRequest

    rider = await _get_rider(current_user.id, db)
    earnings = await DeliveryService(db).compute_rider_earnings(rider)
    pending = float(earnings.get("pending_payout", 0) if isinstance(earnings, dict) else getattr(earnings, "pending_payout", 0))

    if data.amount > pending:
        raise ValidationError(
            f"Requested amount ({data.amount:.0f} RWF) exceeds available balance ({pending:.0f} RWF)"
        )

    from app.services.notification_service import NotificationService
    from app.services.audit_service import AuditService

    withdrawal = WithdrawalRequest(
        id=str(_uuid.uuid4()),
        requester_user_id=current_user.id,
        amount=data.amount,
        payout_method=data.payment_method,
        payout_details={
            "mobile_number": data.mobile_number,
            "rider_id": rider.id,
            "request_type": "rider_payout",
        },
        status=WithdrawalStatus.PENDING,
    )
    db.add(withdrawal)
    await db.flush()

    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="rider.payout_request",
        entity_type="WithdrawalRequest",
        entity_id=withdrawal.id,
        new_value={
            "amount": data.amount,
            "mobile_number": data.mobile_number,
            "payment_method": data.payment_method,
        },
    )

    from app.models.user import User as UserModel
    from sqlalchemy import select as _select

    finance_res = await db.execute(
        _select(UserModel).where(UserModel.role.in_(["finance_admin", "super_admin"]))
    )
    finance_users = finance_res.scalars().all()
    ns = NotificationService(db)
    for fu in finance_users:
        await ns.send(
            user_id=fu.id,
            title="Rider Payout Request",
            message=f"Rider #{rider.id[-6:]} requested {data.amount:.0f} RWF payout to {data.mobile_number} via {data.payment_method}.",
            category="payment",
        )

    await db.commit()

    return RiderPayoutOut(
        id=withdrawal.id,
        status=withdrawal.status,
        amount=data.amount,
        mobile_number=data.mobile_number,
        payment_method=data.payment_method,
        message="Your payout request has been submitted and will be processed within 1–2 business days.",
    )

