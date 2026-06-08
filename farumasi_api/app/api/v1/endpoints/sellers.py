from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.models.user import User
from app.schemas.seller import SellerOpenStatusOut, SetSellerOpenRequest
from app.schemas.seller_change_request import SellerChangeRequestOut, SellerChangeRequestPartnerAction
from app.schemas.seller_payout import (
    PayoutCredentialsIn,
    PayoutCredentialsOut,
    PayoutVerificationSentOut,
)
from app.services.seller_profile_service import SellerProfileService
from app.services.seller_change_request_service import SellerChangeRequestService
from app.services.payout_credentials_service import PayoutCredentialsService

router = APIRouter()

_SELLER_ROLES = {
    UserRole.PHARMACY_ADMIN,
    UserRole.PARTNER_COMPANY_ADMIN,
    UserRole.PHARMACIST,
}


@router.get(
    "/me/open-status",
    response_model=SellerOpenStatusOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def get_my_open_status(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """All pharmacies and partner companies owned by this user."""
    status = await SellerProfileService(db).get_open_status(actor)
    if not status.entities:
        raise NotFoundError("Seller profile")
    return status


@router.patch(
    "/me/open-status",
    response_model=SellerOpenStatusOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def set_my_open_status(
    data: SetSellerOpenRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Set open/closed on every pharmacy and partner company this user owns."""
    service = SellerProfileService(db)
    current = await service.get_open_status(actor)
    if not current.entities:
        raise NotFoundError("Seller profile")
    return await service.set_open_status(actor, data.is_open)


@router.get(
    "/me/change-requests",
    response_model=list[SellerChangeRequestOut],
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def list_my_change_requests(
    scope: str = Query("pending", pattern="^(pending|all)$"),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    svc = SellerChangeRequestService(db)
    if scope == "all":
        return await svc.list_all_for_owner(actor.id)
    return await svc.list_pending_for_owner(actor.id)


@router.post(
    "/me/change-requests/{request_id}/approve",
    response_model=SellerChangeRequestOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def approve_my_change_request(
    request_id: str,
    data: SellerChangeRequestPartnerAction = SellerChangeRequestPartnerAction(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    req = await SellerChangeRequestService(db).approve(
        request_id, actor, partner_note=data.partner_note
    )
    return await SellerChangeRequestService(db)._to_out(req)


@router.post(
    "/me/change-requests/{request_id}/reject",
    response_model=SellerChangeRequestOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def reject_my_change_request(
    request_id: str,
    data: SellerChangeRequestPartnerAction = SellerChangeRequestPartnerAction(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    req = await SellerChangeRequestService(db).reject(
        request_id, actor, partner_note=data.partner_note
    )
    return await SellerChangeRequestService(db)._to_out(req)


@router.get(
    "/me/payout-credentials",
    response_model=PayoutCredentialsOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def get_my_payout_credentials(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PayoutCredentialsService(db).get_for_owner(actor.id)


@router.post(
    "/me/payout-credentials/send-verification",
    response_model=PayoutVerificationSentOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def send_payout_credentials_verification(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    minutes = await PayoutCredentialsService(db).send_update_verification(actor)
    return PayoutVerificationSentOut(
        message=f"Verification code sent to {actor.email}",
        expires_in_minutes=minutes,
    )


@router.put(
    "/me/payout-credentials",
    response_model=PayoutCredentialsOut,
    dependencies=[Depends(require_roles(*_SELLER_ROLES))],
)
async def set_my_payout_credentials(
    data: PayoutCredentialsIn,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PayoutCredentialsService(db).set_credentials(actor, data)
