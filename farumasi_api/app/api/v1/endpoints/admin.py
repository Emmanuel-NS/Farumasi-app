from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, distinct

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin, require_audit_reader, require_any_admin
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
from app.schemas.admin_management import (
    AdminCreateUserRequest,
    AdminCreateUserResponse,
    OnboardPharmacyRequest,
    OnboardPartnerRequest,
    OnboardSellerResponse,
    SellerFinanceSummary,
    OrderAdminSummary,
    PrescriptionAdminSummary,
)
from app.schemas.seller_onboarding import (
    DraftPartnerOnboardRequest,
    DraftPharmacyOnboardRequest,
    DraftSellerOut,
)
from app.schemas.seller_change_request import SellerChangeRequestCreate, SellerChangeRequestOut
from app.services.seller_onboarding_service import SellerOnboardingService
from app.services.seller_change_request_service import SellerChangeRequestService
from app.services.admin_management_service import AdminManagementService

router = APIRouter()


@router.get(
    "/audit-logs/meta/entity-types",
    dependencies=[Depends(require_audit_reader())],
)
async def audit_entity_types(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(distinct(AuditLog.entity_type)).where(AuditLog.entity_type.isnot(None))
        )
    ).scalars().all()
    return sorted([r for r in rows if r])


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
    search: str | None = Query(None, description="Match action, entity_id, or entity_type"),
    sort_by: str = Query("created_at", pattern="^(created_at|action)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id:
        filters.append(AuditLog.entity_id == entity_id)
    if action:
        action_key = action.strip().lower()
        filters.append(
            or_(
                AuditLog.action.ilike(f"%{action_key}%"),
                AuditLog.action.ilike(f"%{action.strip()}%"),
            )
        )
    if actor_user_id:
        filters.append(AuditLog.actor_user_id == actor_user_id)
    if search:
        like = f"%{search.strip()}%"
        filters.append(
            or_(
                AuditLog.entity_id.ilike(like),
                AuditLog.action.ilike(like),
                AuditLog.entity_type.ilike(like),
            )
        )

    count_q = select(func.count(AuditLog.id))
    data_q = select(AuditLog)
    if filters:
        count_q = count_q.where(*filters)
        data_q = data_q.where(*filters)

    total = (await db.execute(count_q)).scalar_one()
    sort_col = AuditLog.created_at if sort_by == "created_at" else AuditLog.action
    order = sort_col.asc() if sort_dir == "asc" else sort_col.desc()
    data_q = data_q.order_by(order).offset(offset).limit(limit)
    result = await db.execute(data_q)
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


@router.post(
    "/users",
    response_model=AdminCreateUserResponse,
    status_code=201,
    dependencies=[Depends(require_super_admin())],
)
async def admin_create_user(
    data: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await AdminManagementService(db).create_user(data, actor)


@router.post(
    "/onboard/pharmacy",
    response_model=DraftSellerOut,
    status_code=201,
    dependencies=[Depends(require_super_admin())],
)
async def admin_draft_pharmacy(
    data: DraftPharmacyOnboardRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Super admin pre-registers a pharmacy shell for public owner application."""
    return await SellerOnboardingService(db).draft_pharmacy(data, actor)


@router.post(
    "/onboard/partner",
    response_model=DraftSellerOut,
    status_code=201,
    dependencies=[Depends(require_super_admin())],
)
async def admin_draft_partner(
    data: DraftPartnerOnboardRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await SellerOnboardingService(db).draft_partner(data, actor)


@router.get(
    "/sellers/pharmacy/{pharmacy_id}/finance",
    response_model=SellerFinanceSummary,
    dependencies=[Depends(require_any_admin())],
)
async def pharmacy_finance_summary(pharmacy_id: str, db: AsyncSession = Depends(get_db)):
    return await AdminManagementService(db).pharmacy_finance(pharmacy_id)


@router.get(
    "/sellers/partner/{partner_id}/finance",
    response_model=SellerFinanceSummary,
    dependencies=[Depends(require_any_admin())],
)
async def partner_finance_summary(partner_id: str, db: AsyncSession = Depends(get_db)):
    return await AdminManagementService(db).partner_finance(partner_id)


@router.post(
    "/sellers/pharmacy/{pharmacy_id}/change-requests",
    response_model=SellerChangeRequestOut,
    dependencies=[Depends(require_super_admin())],
)
async def propose_pharmacy_change(
    pharmacy_id: str,
    data: SellerChangeRequestCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    req = await SellerChangeRequestService(db).create_for_pharmacy(
        pharmacy_id,
        field_name=data.field_name,
        proposed_value=data.proposed_value,
        admin_note=data.admin_note,
        actor=actor,
    )
    return await SellerChangeRequestService(db)._to_out(req)


@router.get(
    "/sellers/pharmacy/{pharmacy_id}/change-requests",
    response_model=list[SellerChangeRequestOut],
    dependencies=[Depends(require_any_admin())],
)
async def list_pharmacy_change_requests(pharmacy_id: str, db: AsyncSession = Depends(get_db)):
    return await SellerChangeRequestService(db).list_for_pharmacy(pharmacy_id)


@router.post(
    "/sellers/partner/{partner_id}/change-requests",
    response_model=SellerChangeRequestOut,
    dependencies=[Depends(require_super_admin())],
)
async def propose_partner_change(
    partner_id: str,
    data: SellerChangeRequestCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    req = await SellerChangeRequestService(db).create_for_partner(
        partner_id,
        field_name=data.field_name,
        proposed_value=data.proposed_value,
        admin_note=data.admin_note,
        actor=actor,
    )
    return await SellerChangeRequestService(db)._to_out(req)


@router.get(
    "/sellers/partner/{partner_id}/change-requests",
    response_model=list[SellerChangeRequestOut],
    dependencies=[Depends(require_any_admin())],
)
async def list_partner_change_requests(partner_id: str, db: AsyncSession = Depends(get_db)):
    return await SellerChangeRequestService(db).list_for_partner(partner_id)


@router.get(
    "/prescriptions/summary",
    response_model=PrescriptionAdminSummary,
    dependencies=[Depends(require_any_admin())],
)
async def prescriptions_admin_summary(db: AsyncSession = Depends(get_db)):
    return await AdminManagementService(db).prescription_summary()


@router.get(
    "/orders/summary",
    response_model=OrderAdminSummary,
    dependencies=[Depends(require_any_admin())],
)
async def orders_admin_summary(db: AsyncSession = Depends(get_db)):
    return await AdminManagementService(db).orders_admin_summary()


@router.post(
    "/users/{user_id}/force-password-reset",
    dependencies=[Depends(require_super_admin())],
)
async def admin_force_password_reset(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    from app.services.password_reset_service import PasswordResetService

    return await PasswordResetService(db).admin_force_reset(user_id, actor)
