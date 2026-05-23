from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import EntityStatus, UserStatus
from app.core.exceptions import NotFoundError, ValidationError
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.rider import RiderProfile
from app.repositories.base import BaseRepository
from app.schemas.user import UserUpdate, UserStatusUpdate
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = BaseRepository[User](User, db)

    async def get_user(self, user_id: str) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user

    async def update_user(self, user_id: str, data: UserUpdate, actor: User) -> User:
        user = await self.get_user(user_id)

        if user_id != actor.id and actor.role != "super_admin":
            from app.core.exceptions import PermissionDenied
            raise PermissionDenied("You may only edit your own profile")

        old_snapshot = {"first_name": user.first_name, "last_name": user.last_name, "phone": user.phone}

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(user, field, value)

        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="user.updated",
            entity_type="User",
            entity_id=user_id,
            old_value=old_snapshot,
            new_value=data.model_dump(exclude_unset=True),
        )
        return user

    async def change_status(self, user_id: str, data: UserStatusUpdate, actor: User) -> User:
        user = await self.get_user(user_id)
        old_status = user.status
        user.status = data.status
        await self.db.flush()

        # Notify user
        notif = NotificationService(self.db)
        await notif.account_status_changed(user_id, data.status)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="user.status_changed",
            entity_type="User",
            entity_id=user_id,
            old_value={"status": old_status},
            new_value={"status": data.status},
        )
        return user

    async def list_users(
        self,
        role: Optional[str] = None,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[User], int]:
        filters = []
        if role:
            filters.append(User.role == role)
        if status:
            filters.append(User.status == status)

        return await self.repo.list(*filters, offset=offset, limit=limit)

    async def delete_user(self, user_id: str, actor: User) -> None:
        user = await self.get_user(user_id)
        # Soft-delete: set status to suspended
        user.status = UserStatus.SUSPENDED
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="user.deleted",
            entity_type="User",
            entity_id=user_id,
        )
