"""Shared helpers for resolving the Pharmacy a user belongs to.

Both PHARMACY_ADMIN (owner) and PHARMACIST (staff) should be able to access
the same pharmacy-scoped data. PHARMACY_ADMIN is resolved via the
``pharmacies.owner_user_id`` field; PHARMACIST via ``pharmacist_profiles.pharmacy_id``.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.models.pharmacy import Pharmacy
from app.models.pharmacist import PharmacistProfile
from app.models.user import User


async def resolve_user_pharmacy(db: AsyncSession, actor: User) -> Optional[Pharmacy]:
    """Return the Pharmacy this user belongs to (owner or assigned staff)."""
    if actor.role == UserRole.PHARMACY_ADMIN:
        res = await db.execute(
            select(Pharmacy).where(Pharmacy.owner_user_id == actor.id)
        )
        return res.scalar_one_or_none()
    if actor.role == UserRole.PHARMACIST:
        res = await db.execute(
            select(PharmacistProfile.pharmacy_id).where(
                PharmacistProfile.user_id == actor.id
            )
        )
        pid = res.scalar_one_or_none()
        if not pid:
            return None
        res = await db.execute(select(Pharmacy).where(Pharmacy.id == pid))
        return res.scalar_one_or_none()
    return None


async def user_owns_pharmacy(
    db: AsyncSession, actor: User, pharmacy_id: str
) -> bool:
    pharmacy = await resolve_user_pharmacy(db, actor)
    return pharmacy is not None and pharmacy.id == pharmacy_id


async def list_pharmacy_staff_user_ids(
    db: AsyncSession, pharmacy_id: str
) -> list[str]:
    """Return de-duplicated user IDs for every staff member of a pharmacy.

    Includes the PHARMACY_ADMIN owner (via ``pharmacies.owner_user_id``)
    plus every PHARMACIST profile linked via ``pharmacist_profiles.pharmacy_id``.
    Used for fan-out notifications (new order, prescription review needed,
    etc.) so the whole pharmacy team is alerted, not just the owner.
    """
    user_ids: list[str] = []

    owner_res = await db.execute(
        select(Pharmacy.owner_user_id).where(Pharmacy.id == pharmacy_id)
    )
    owner_id = owner_res.scalar_one_or_none()
    if owner_id:
        user_ids.append(owner_id)

    staff_res = await db.execute(
        select(PharmacistProfile.user_id).where(
            PharmacistProfile.pharmacy_id == pharmacy_id
        )
    )
    for uid in staff_res.scalars().all():
        if uid and uid not in user_ids:
            user_ids.append(uid)
    return user_ids
