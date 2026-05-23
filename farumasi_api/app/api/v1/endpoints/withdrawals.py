from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_finance
from app.models.user import User
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.models.revenue import WithdrawalRequest
from app.schemas.revenue import WithdrawalCreate, WithdrawalOut, WithdrawalActionInput
from app.services.revenue_service import RevenueService
from app.core.exceptions import NotFoundError

router = APIRouter()


@router.post("/", response_model=WithdrawalOut, status_code=201)
async def request_withdrawal(
    data: WithdrawalCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    pharmacy_result = await db.execute(select(Pharmacy).where(Pharmacy.owner_user_id == actor.id))
    pharmacy = pharmacy_result.scalar_one_or_none()
    partner_result = await db.execute(select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id))
    partner = partner_result.scalar_one_or_none()
    return await RevenueService(db).request_withdrawal(
        data, actor,
        pharmacy_id=pharmacy.id if pharmacy else None,
        partner_company_id=partner.id if partner else None,
    )


@router.get("/", response_model=list[WithdrawalOut], dependencies=[Depends(require_finance())])
async def list_withdrawals(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(WithdrawalRequest)
    if status:
        query = query.where(WithdrawalRequest.status == status)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/{withdrawal_id}/approve", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def approve_withdrawal(
    withdrawal_id: str,
    data: WithdrawalActionInput = WithdrawalActionInput(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await RevenueService(db).approve_withdrawal(withdrawal_id, actor, notes=data.notes)


@router.post("/{withdrawal_id}/reject", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def reject_withdrawal(
    withdrawal_id: str,
    data: WithdrawalActionInput = WithdrawalActionInput(),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await RevenueService(db).reject_withdrawal(withdrawal_id, actor, notes=data.notes)


@router.post("/{withdrawal_id}/mark-paid", response_model=WithdrawalOut, dependencies=[Depends(require_finance())])
async def mark_paid(
    withdrawal_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await RevenueService(db).mark_paid(withdrawal_id, actor)
