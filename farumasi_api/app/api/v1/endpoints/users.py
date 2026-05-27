from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.constants import UserStatus
from app.core.exceptions import AuthenticationError
from app.core.security import verify_password
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.schemas.user import (
    UserOut,
    UserUpdate,
    UserStatusUpdate,
    NotificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
    DeleteAccountRequest,
)
from app.schemas.common import PaginatedResponse
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await UserService(db).update_user(current_user.id, data, actor=current_user)


# ── Notification preferences ────────────────────────────────────────────────
@router.get("/me/notification-preferences", response_model=NotificationPreferences)
async def get_my_notification_preferences(
    current_user: User = Depends(get_current_user),
):
    raw = current_user.notification_prefs
    if not raw:
        return DEFAULT_NOTIFICATION_PREFERENCES
    return NotificationPreferences.model_validate(raw)


@router.put("/me/notification-preferences", response_model=NotificationPreferences)
async def update_my_notification_preferences(
    data: NotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.notification_prefs = data.model_dump()
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.notification_preferences.update",
        entity_type="User",
        entity_id=current_user.id,
        new_value=current_user.notification_prefs,
    )
    return data


# ── Data export (stub: queues an email-delivery request) ────────────────────
@router.post("/me/export-data", status_code=202)
async def request_data_export(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.data_export.request",
        entity_type="User",
        entity_id=current_user.id,
    )
    return {
        "status": "queued",
        "message": f"We are preparing your data export and will email it to {current_user.email} within 48 hours.",
    }


# ── Account deletion (soft-delete) ──────────────────────────────────────────
@router.delete("/me", status_code=200)
async def delete_my_account(
    data: DeleteAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.password, current_user.password_hash):
        raise AuthenticationError("Password is incorrect")

    now = datetime.now(timezone.utc)
    current_user.status = UserStatus.ARCHIVED
    current_user.deleted_at = now
    current_user.session_invalidated_at = now
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.account.delete",
        entity_type="User",
        entity_id=current_user.id,
        new_value={"reason": data.reason} if data.reason else None,
    )
    return {"status": "deleted", "message": "Your account has been deactivated."}


@router.get("/{user_id}", response_model=UserOut, dependencies=[Depends(require_super_admin())])
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    return await UserService(db).get_user(user_id)


@router.patch("/{user_id}/status", response_model=UserOut, dependencies=[Depends(require_super_admin())])
async def change_user_status(
    user_id: str,
    data: UserStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await UserService(db).change_status(user_id, data, actor=actor)


@router.get("/", response_model=PaginatedResponse[UserOut], dependencies=[Depends(require_super_admin())])
async def list_users(
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await UserService(db).list_users(role=role, status=status, offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)
