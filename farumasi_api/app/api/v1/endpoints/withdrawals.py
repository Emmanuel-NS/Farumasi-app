from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.constants import UserRole
from app.core.database import get_db
from app.core.exceptions import AuthorizationError
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_finance, require_roles
from app.models.user import User
from app.models.revenue import WithdrawalRequest
from app.schemas.revenue import (
    WithdrawalAmountRequest,
    WithdrawalOut,
    WithdrawalAdminOut,
    WithdrawalActionInput,
    MarkWithdrawalPaidInput,
)
from app.services.revenue_service import RevenueService
from app.core.exceptions import NotFoundError

router = APIRouter()


_PLATFORM_ROLES = {UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN}


_REQUESTER_ROLES = (
    UserRole.PHARMACY_ADMIN,
    UserRole.PARTNER_COMPANY_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.FINANCE_ADMIN,
)


@router.post(
    "/",
    response_model=WithdrawalOut,
    status_code=201,
    dependencies=[Depends(require_roles(*_REQUESTER_ROLES))],
)
async def request_withdrawal(
    data: WithdrawalAmountRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Request payout against combined wallet (pharmacy + partner entities).

    Payout destination is always taken from the owner's registered profile.
    """
    return await RevenueService(db).request_withdrawal_for_owner(data=data, actor=actor)


@router.get("/", response_model=list[WithdrawalAdminOut], dependencies=[Depends(require_finance())])
async def list_withdrawals(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await RevenueService(db).list_withdrawals_admin(status=status)


@router.get("/{withdrawal_id}", response_model=WithdrawalAdminOut)
async def get_withdrawal(
    withdrawal_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    )
    w = result.scalar_one_or_none()
    if not w:
        raise NotFoundError("Withdrawal request", withdrawal_id)
    if actor.role not in _PLATFORM_ROLES and w.requester_user_id != actor.id:
        raise AuthorizationError("You cannot view this withdrawal request")
    if actor.role in _PLATFORM_ROLES:
        return await RevenueService(db).withdrawal_to_admin_out(w)
    from app.schemas.revenue import WithdrawalOut as WO

    base = WO.model_validate(w)
    return WithdrawalAdminOut(**base.model_dump())


@router.post("/{withdrawal_id}/approve", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
@router.patch("/{withdrawal_id}/approve", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def approve_withdrawal(
    withdrawal_id: str,
    data: WithdrawalActionInput = WithdrawalActionInput(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    w = await RevenueService(db).approve_withdrawal(withdrawal_id, actor, notes=data.notes)
    return w


@router.post("/{withdrawal_id}/reject", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
@router.patch("/{withdrawal_id}/reject", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def reject_withdrawal(
    withdrawal_id: str,
    data: WithdrawalActionInput = WithdrawalActionInput(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    w = await RevenueService(db).reject_withdrawal(withdrawal_id, actor, notes=data.notes)
    return w


@router.post("/{withdrawal_id}/mark-paid", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
@router.patch("/{withdrawal_id}/mark-paid", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def mark_paid(
    withdrawal_id: str,
    data: MarkWithdrawalPaidInput = MarkWithdrawalPaidInput(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await RevenueService(db).mark_paid(
        withdrawal_id,
        actor,
        payment_reference=data.payment_reference,
        payment_proof_url=data.payment_proof_url,
        notes=data.notes,
    )
