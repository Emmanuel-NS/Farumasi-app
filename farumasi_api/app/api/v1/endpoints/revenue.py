from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.schemas.revenue import RevenueSummary, RevenueRecordOut
from app.services.revenue_service import RevenueService
from app.core.exceptions import NotFoundError

router = APIRouter()


async def _resolve_entity(actor: User, db: AsyncSession):
    pharmacy_result = await db.execute(select(Pharmacy).where(Pharmacy.owner_user_id == actor.id))
    pharmacy = pharmacy_result.scalar_one_or_none()
    partner_result = await db.execute(select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id))
    partner = partner_result.scalar_one_or_none()
    return pharmacy, partner


@router.get("/summary", response_model=RevenueSummary)
async def get_revenue_summary(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    pharmacy, partner = await _resolve_entity(actor, db)
    return await RevenueService(db).get_summary(
        pharmacy_id=pharmacy.id if pharmacy else None,
        partner_company_id=partner.id if partner else None,
    )
