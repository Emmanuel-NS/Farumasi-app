from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy
from app.models.user import User
from app.schemas.seller import SellerEntityBrief, SellerOpenStatusOut


class SellerProfileService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _owned_pharmacies(self, actor: User) -> list[Pharmacy]:
        rows = await self.db.execute(
            select(Pharmacy).where(Pharmacy.owner_user_id == actor.id).order_by(Pharmacy.name)
        )
        return list(rows.scalars().all())

    async def _owned_partners(self, actor: User) -> list[PartnerCompany]:
        rows = await self.db.execute(
            select(PartnerCompany)
            .where(PartnerCompany.owner_user_id == actor.id)
            .order_by(PartnerCompany.name)
        )
        return list(rows.scalars().all())

    async def get_open_status(self, actor: User) -> SellerOpenStatusOut:
        pharmacies = await self._owned_pharmacies(actor)
        partners = await self._owned_partners(actor)
        entities: list[SellerEntityBrief] = [
            SellerEntityBrief(
                id=p.id,
                name=p.name,
                kind="pharmacy",
                is_open=bool(p.is_open),
            )
            for p in pharmacies
        ] + [
            SellerEntityBrief(
                id=c.id,
                name=c.name,
                kind="partner_company",
                is_open=bool(c.is_open),
            )
            for c in partners
        ]
        # Toggle shows "open" only when every owned seller entity is open.
        is_open = all(e.is_open for e in entities) if entities else True
        return SellerOpenStatusOut(is_open=is_open, entities=entities)

    async def set_open_status(self, actor: User, is_open: bool) -> SellerOpenStatusOut:
        pharmacies = await self._owned_pharmacies(actor)
        partners = await self._owned_partners(actor)
        for pharmacy in pharmacies:
            pharmacy.is_open = is_open
        for company in partners:
            company.is_open = is_open
        await self.db.commit()
        return await self.get_open_status(actor)
