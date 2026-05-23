from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.dependencies.roles import require_super_admin, require_audit_reader
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.hospital import Hospital
from app.models.hospital_admin import HospitalAdminProfile
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.models.rider import RiderProfile
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get(
    "/audit-logs",
    response_model=PaginatedResponse[AuditLogOut],
    dependencies=[Depends(require_audit_reader())],
)
async def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: str | None = Query(None),
    action: str | None = Query(None),
    actor_user_id: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditLog.entity_id == entity_id)
    if action:
        q = q.where(AuditLog.action == action)
    if actor_user_id:
        q = q.where(AuditLog.actor_user_id == actor_user_id)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    q = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get(
    "/audit-logs/entity/{entity_type}/{entity_id}",
    response_model=PaginatedResponse[AuditLogOut],
    dependencies=[Depends(require_audit_reader())],
)
async def list_audit_logs_for_entity(
    entity_type: str,
    entity_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(AuditLog).where(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id,
    )
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    q = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get(
    "/audit-logs/{log_id}",
    response_model=AuditLogOut,
    dependencies=[Depends(require_audit_reader())],
)
async def get_audit_log(log_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise NotFoundError("AuditLog", log_id)
    return log


@router.get("/profiles/overview", dependencies=[Depends(require_super_admin())])
async def profiles_overview(db: AsyncSession = Depends(get_db)):
    """Return entity counts grouped by profile type — Phase 2 admin snapshot."""
    async def count(model):
        return (await db.execute(select(func.count(model.id)))).scalar_one()

    return {
        "patients": await count(PatientProfile),
        "doctors": await count(DoctorProfile),
        "pharmacists": await count(PharmacistProfile),
        "hospitals": await count(Hospital),
        "hospital_admins": await count(HospitalAdminProfile),
        "pharmacies": await count(Pharmacy),
        "partner_companies": await count(PartnerCompany),
        "riders": await count(RiderProfile),
    }
