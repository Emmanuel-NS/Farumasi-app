from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationOut,
    NotificationCreate,
    NotificationUnreadCount,
)
from app.schemas.common import PaginatedResponse
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(False),
    category: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    q = select(Notification).where(Notification.user_id == actor.id)
    if unread_only:
        q = q.where(Notification.read_status == False)  # noqa: E712
    if category:
        q = q.where(Notification.category == category)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    q = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == actor.id,
            Notification.read_status == False,  # noqa: E712
        )
    )
    return NotificationUnreadCount(unread=int(result.scalar_one()))


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    from app.core.exceptions import NotFoundError, AuthorizationError
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise NotFoundError("Notification", notification_id)
    if notif.user_id != actor.id:
        raise AuthorizationError("You can only read your own notifications")
    notif.read_status = True
    await db.commit()
    await db.refresh(notif)
    return notif


@router.post("/mark-all-read", status_code=204)
async def mark_all_read_post(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == actor.id, Notification.read_status == False)  # noqa: E712
        .values(read_status=True)
    )
    await db.commit()


@router.patch("/read-all", status_code=204)
async def mark_all_read_patch(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Alias for PATCH /notifications/read-all (used by patient portal)."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == actor.id, Notification.read_status == False)  # noqa: E712
        .values(read_status=True)
    )
    await db.commit()


@router.post(
    "/",
    response_model=NotificationOut,
    status_code=201,
    dependencies=[Depends(require_super_admin())],
)
async def create_system_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Super-admin broadcast: send a system notification to a single user."""
    notif = await NotificationService(db).send(
        user_id=data.user_id,
        title=data.title,
        message=data.message,
        category=data.category or "system",
        action_url=data.action_url,
    )
    await db.commit()
    await db.refresh(notif)
    return notif

