from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.database import get_db
from app.dependencies.roles import require_roles
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Substring match on entity_id"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(
            UserRole.PHARMACY_ADMIN,
            UserRole.PARTNER_COMPANY_ADMIN,
            UserRole.SUPER_ADMIN,
            UserRole.PHARMACIST,
            UserRole.OPERATIONS_ADMIN,
            UserRole.FINANCE_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        )
    ),
):
    """List audit logs.

    - SUPER_ADMIN sees all logs.
    - PHARMACY_ADMIN / PARTNER_COMPANY_ADMIN / PHARMACIST only see logs they performed.
    """
    stmt = select(AuditLog)
    count_stmt = select(func.count(AuditLog.id))

    if actor.role != UserRole.SUPER_ADMIN:
        stmt = stmt.where(AuditLog.actor_user_id == actor.id)
        count_stmt = count_stmt.where(AuditLog.actor_user_id == actor.id)

    if action:
        action_key = action.strip().lower()
        stmt = stmt.where(
            or_(
                AuditLog.action.ilike(f"%{action_key}%"),
                AuditLog.action.ilike(f"%{action.strip()}%"),
            )
        )
        count_stmt = count_stmt.where(
            or_(
                AuditLog.action.ilike(f"%{action_key}%"),
                AuditLog.action.ilike(f"%{action.strip()}%"),
            )
        )
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
        count_stmt = count_stmt.where(AuditLog.entity_type == entity_type)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                AuditLog.entity_id.ilike(like),
                AuditLog.action.ilike(like),
            )
        )
        count_stmt = count_stmt.where(
            or_(
                AuditLog.entity_id.ilike(like),
                AuditLog.action.ilike(like),
            )
        )

    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    total = (await db.execute(count_stmt)).scalar_one()
    items = (await db.execute(stmt)).scalars().all()
    return PaginatedResponse(
        items=list(items), total=total, offset=offset, limit=limit
    )
