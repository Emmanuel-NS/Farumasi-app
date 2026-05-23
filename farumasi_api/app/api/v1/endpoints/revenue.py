from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.constants import UserRole
from app.core.database import get_db
from app.core.exceptions import AuthorizationError
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_finance
from app.models.user import User
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.schemas.revenue import RevenueSummary, RevenueRecordOut
from app.services.revenue_service import RevenueService
from app.core.exceptions import NotFoundError

router = APIRouter()


_PLATFORM_ROLES = {UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN}
_OWNER_ROLES = {UserRole.PHARMACY_ADMIN, UserRole.PARTNER_COMPANY_ADMIN}


def _empty_summary() -> RevenueSummary:
    return RevenueSummary(
        total_gross=0.0, total_commission=0.0, total_net=0.0,
        available_balance=0.0, pending_balance=0.0, withdrawn_total=0.0,
        gross_revenue=0.0, platform_commission=0.0, net_revenue=0.0,
        withdrawn_amount=0.0, pending_withdrawals=0.0, paid_withdrawals=0.0,
        total_orders=0, completed_orders=0,
    )


async def _resolve_entity(actor: User, db: AsyncSession):
    pharmacy_result = await db.execute(select(Pharmacy).where(Pharmacy.owner_user_id == actor.id))
    pharmacy = pharmacy_result.scalar_one_or_none()
    partner_result = await db.execute(select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id))
    partner = partner_result.scalar_one_or_none()
    return pharmacy, partner


@router.get("/", response_model=list[RevenueRecordOut], dependencies=[Depends(require_finance())])
async def list_revenue_records(
    pharmacy_id: Optional[str] = Query(None),
    partner_company_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await RevenueService(db).list_records(
        pharmacy_id=pharmacy_id, partner_company_id=partner_company_id
    )


@router.get("/summary", response_model=RevenueSummary)
async def get_revenue_summary(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    # Platform-wide view is restricted to super_admin / finance_admin.
    if actor.role in _PLATFORM_ROLES:
        return await RevenueService(db).get_summary()

    if actor.role not in _OWNER_ROLES:
        raise AuthorizationError(
            "Only pharmacy or partner company owners can view their revenue"
        )

    pharmacy, partner = await _resolve_entity(actor, db)
    # Owner without an associated entity yet → own (empty) scope, not platform.
    if not pharmacy and not partner:
        return _empty_summary()
    return await RevenueService(db).get_summary(
        pharmacy_id=pharmacy.id if pharmacy else None,
        partner_company_id=partner.id if partner else None,
    )


@router.get(
    "/pharmacy/{pharmacy_id}",
    response_model=list[RevenueRecordOut],
    dependencies=[Depends(require_finance())],
)
async def list_pharmacy_revenue(
    pharmacy_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await RevenueService(db).list_records(pharmacy_id=pharmacy_id)


@router.get(
    "/partner/{partner_id}",
    response_model=list[RevenueRecordOut],
    dependencies=[Depends(require_finance())],
)
async def list_partner_revenue(
    partner_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await RevenueService(db).list_records(partner_company_id=partner_id)


