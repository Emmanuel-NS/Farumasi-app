import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.partner import PartnerCompany
from app.models.user import User


async def main():
    async with AsyncSessionLocal() as db:
        u = (
            await db.execute(select(User).where(User.email == "partner_admin@farumasi.com"))
        ).scalar_one_or_none()
        if not u:
            print("partner_admin user not found")
            return
        partner = (
            await db.execute(select(PartnerCompany).where(PartnerCompany.name == "MediHub Rwanda"))
        ).scalar_one_or_none()
        if not partner:
            print("MediHub Rwanda not found")
            return
        old = partner.owner_user_id
        partner.owner_user_id = u.id
        await db.commit()
        print(f"Fixed MediHub Rwanda owner: {old} -> {u.id}")


asyncio.run(main())
