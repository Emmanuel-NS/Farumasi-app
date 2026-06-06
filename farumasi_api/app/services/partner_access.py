"""Shared helpers for resolving the PartnerCompany a user belongs to.

PARTNER_COMPANY_ADMIN is resolved via ``partner_companies.owner_user_id``.
(Future: extend with a staff/members table when team invites are implemented.)
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.models.partner import PartnerCompany
from app.models.user import User


async def resolve_user_partner(db: AsyncSession, actor: User) -> Optional[PartnerCompany]:
    """Return the partner company this user belongs to (currently: owner only)."""
    if actor.role != UserRole.PARTNER_COMPANY_ADMIN:
        return None
    res = await db.execute(
        select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id)
    )
    return res.scalars().first()


async def user_owns_partner(db: AsyncSession, actor: User, partner_company_id: str) -> bool:
    company = await resolve_user_partner(db, actor)
    return company is not None and company.id == partner_company_id
