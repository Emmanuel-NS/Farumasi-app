from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[NotificationOut])
async def list_notifications(
    unread_only: bool = Query(False),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    q = select(Notification).where(Notification.user_id == actor.id)
    if unread_only:
        q = q.where(Notification.read_status == False)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    q = q.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    from app.core.exceptions import NotFoundError
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == actor.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise NotFoundError("Notification", notification_id)
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
        .where(Notification.user_id == actor.id, Notification.read_status == False)
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
        .where(Notification.user_id == actor.id, Notification.read_status == False)
        .values(read_status=True)
    )
    await db.commit()

