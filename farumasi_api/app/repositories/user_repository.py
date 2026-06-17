from __future__ import annotations

from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_email_and_role(self, email: str, role: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.email == email.lower(), User.role == role)
        )
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.phone == phone).limit(1))
        return result.scalar_one_or_none()

    async def get_by_phone_and_role(self, phone: str, role: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(User.phone == phone, User.role == role)
        )
        return result.scalar_one_or_none()

    async def list_by_email(self, email: str) -> list[User]:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return list(result.scalars().all())

    async def list_by_phone(self, phone: str) -> list[User]:
        result = await self.db.execute(select(User).where(User.phone == phone))
        return list(result.scalars().all())

    async def email_exists(self, email: str) -> bool:
        return (await self.get_by_email(email)) is not None

    async def email_exists_for_role(self, email: str, role: str) -> bool:
        return (await self.get_by_email_and_role(email, role)) is not None

    async def phone_exists(self, phone: str) -> bool:
        if not phone:
            return False
        return (await self.get_by_phone(phone)) is not None

    async def phone_exists_for_role(self, phone: str, role: str) -> bool:
        if not phone:
            return False
        return (await self.get_by_phone_and_role(phone, role)) is not None

    async def find_by_identifier_and_roles(
        self, identifier: str, roles: Sequence[str]
    ) -> Optional[User]:
        for role in roles:
            if "@" in identifier:
                user = await self.get_by_email_and_role(identifier, role)
            else:
                user = await self.get_by_phone_and_role(identifier, role)
                if not user:
                    user = await self.get_by_phone_and_role(identifier.strip(), role)
            if user:
                return user
        return None
