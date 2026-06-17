from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

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
    FcmTokenUpdate,
)
from app.schemas.common import PaginatedResponse
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter()


def _coerce_notification_prefs(raw: dict | None) -> NotificationPreferences:
    """Merge stored prefs with defaults so partial legacy rows still work."""
    if not raw:
        return DEFAULT_NOTIFICATION_PREFERENCES
    defaults = DEFAULT_NOTIFICATION_PREFERENCES.model_dump()
    merged = {
        "channels": {**defaults["channels"], **(raw.get("channels") or {})},
        "events": {**defaults["events"], **(raw.get("events") or {})},
    }
    return NotificationPreferences.model_validate(merged)


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
    return _coerce_notification_prefs(raw if isinstance(raw, dict) else None)


@router.put("/me/notification-preferences", response_model=NotificationPreferences)
async def update_my_notification_preferences(
    data: NotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    merged = _coerce_notification_prefs(data.model_dump())
    current_user.notification_prefs = merged.model_dump()
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.notification_preferences.update",
        entity_type="User",
        entity_id=current_user.id,
        new_value=current_user.notification_prefs,
    )
    return merged


@router.put("/me/fcm-token", status_code=204)
async def register_fcm_token(
    data: FcmTokenUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.fcm_token = data.token.strip()
    current_user.fcm_platform = data.platform
    await db.flush()


@router.delete("/me/fcm-token", status_code=204)
async def clear_fcm_token(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.fcm_token = None
    current_user.fcm_platform = None
    await db.flush()


# ── Data export ────────────────────────────────────────────────────────────
@router.post("/me/export-data", status_code=202)
async def request_data_export(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.data_export_job import DataExportJob

    job = DataExportJob(user_id=current_user.id, status="pending")
    db.add(job)
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="user.data_export.request",
        entity_type="DataExportJob",
        entity_id=job.id,
    )
    return {
        "status": "queued",
        "job_id": job.id,
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
    current_user.fcm_token = None
    current_user.fcm_platform = None

    # Purge prescription upload URLs for this patient (retain metadata for compliance window).
    from app.models.patient import PatientProfile
    from app.models.prescription import DigitalPrescription

    patient_res = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    patient = patient_res.scalar_one_or_none()
    if patient:
        rx_res = await db.execute(
            select(DigitalPrescription).where(DigitalPrescription.patient_id == patient.id)
        )
        for rx in rx_res.scalars():
            rx.uploaded_file_url = None

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
