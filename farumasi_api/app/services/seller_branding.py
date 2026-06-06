from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy


def _name_key(name: str | None) -> str:
    return (name or "").strip().lower()


def build_partner_logo_index(partners: list[PartnerCompany]) -> dict[tuple[str, str], str]:
    """Map (owner_user_id, normalized name) → logo_url for partner company branding."""
    idx: dict[tuple[str, str], str] = {}
    for co in partners:
        if co.logo_url and co.owner_user_id:
            idx[(co.owner_user_id, _name_key(co.name))] = co.logo_url
    return idx


def resolve_pharmacy_logo(
    pharmacy: Pharmacy,
    partner_logo_index: dict[tuple[str, str], str],
) -> str | None:
    """Prefer pharmacy.logo_url; fall back to same-owner partner company logo by name."""
    if pharmacy.logo_url:
        return pharmacy.logo_url
    if not pharmacy.owner_user_id:
        return None
    return partner_logo_index.get((pharmacy.owner_user_id, _name_key(pharmacy.name)))


async def load_partner_logo_index(
    db: AsyncSession, owner_user_ids: list[str]
) -> dict[tuple[str, str], str]:
    if not owner_user_ids:
        return {}
    result = await db.execute(
        select(PartnerCompany).where(PartnerCompany.owner_user_id.in_(owner_user_ids))
    )
    return build_partner_logo_index(list(result.scalars().all()))


async def sync_partner_logo_to_pharmacies(db: AsyncSession, company: PartnerCompany) -> None:
    """Copy partner company logo onto owned pharmacies with the same business name."""
    if not company.logo_url or not company.owner_user_id:
        return
    result = await db.execute(
        select(Pharmacy).where(Pharmacy.owner_user_id == company.owner_user_id)
    )
    key = _name_key(company.name)
    for pharmacy in result.scalars().all():
        if _name_key(pharmacy.name) == key:
            pharmacy.logo_url = company.logo_url
