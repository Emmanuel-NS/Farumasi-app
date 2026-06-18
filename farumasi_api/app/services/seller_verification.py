from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import EntityStatus, UserRole, VerificationStatus
from app.core.exceptions import BusinessRuleError
from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy
from app.models.user import User


async def assert_seller_verified_for_mutation(
    db: AsyncSession,
    *,
    actor: User,
    pharmacy_id: str | None = None,
    partner_company_id: str | None = None,
) -> None:
    """Block listing/order mutations until the seller entity is verified and active."""
    if actor.role == UserRole.SUPER_ADMIN:
        return

    if pharmacy_id:
        row = (
            await db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
        ).scalar_one_or_none()
        if not row:
            return
        if row.verification_status != VerificationStatus.VERIFIED:
            raise BusinessRuleError(
                "Your pharmacy must be verified before you can manage listings or orders."
            )
        if row.status != EntityStatus.ACTIVE:
            raise BusinessRuleError("Your pharmacy account is not active.")
        return

    if partner_company_id:
        row = (
            await db.execute(
                select(PartnerCompany).where(PartnerCompany.id == partner_company_id)
            )
        ).scalar_one_or_none()
        if not row:
            return
        if row.verification_status != VerificationStatus.VERIFIED:
            raise BusinessRuleError(
                "Your company must be approved before you can manage listings or orders."
            )
        if row.status != EntityStatus.ACTIVE:
            raise BusinessRuleError("Your partner account is not active.")
