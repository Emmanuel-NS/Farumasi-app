from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.roles import require_any_admin
from app.models.user import User
from app.schemas.analytics import AdminSummaryOut, PaymentAnalyticsOut
from app.schemas.payment import PaymentTransactionOut
from app.schemas.admin_management import (
    OrderAdminSummary,
    PatientCatalogInsights,
    PrescriptionAdminSummary,
)
from app.services.analytics_service import AnalyticsService
from app.services.admin_management_service import AdminManagementService

router = APIRouter()


@router.get("/admin", response_model=AdminSummaryOut, dependencies=[Depends(require_any_admin())])
async def admin_summary(db: AsyncSession = Depends(get_db)):
    return await AnalyticsService(db).admin_summary()


@router.get(
    "/payments/summary",
    response_model=PaymentAnalyticsOut,
    dependencies=[Depends(require_any_admin())],
)
async def payments_summary(db: AsyncSession = Depends(get_db)):
    """Collected payments by method — MTN MoMo, card, manual MoMo, etc."""
    return await AnalyticsService(db).payment_summary()


@router.get(
    "/payments/transactions",
    response_model=list[PaymentTransactionOut],
    dependencies=[Depends(require_any_admin())],
)
async def payment_transactions(
    status: str | None = Query(None, description="Filter by status, e.g. successful"),
    method: str | None = Query(None, description="Filter by method, e.g. manual_momo"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Unified ledger of all patient payment transactions."""
    items, _total = await AnalyticsService(db).list_payment_transactions(
        status=status,
        method=method,
        limit=limit,
        offset=offset,
    )
    return items


@router.get(
    "/orders/summary",
    response_model=OrderAdminSummary,
    dependencies=[Depends(require_any_admin())],
)
async def orders_summary(db: AsyncSession = Depends(get_db)):
    """Platform order pipeline counts — same data as GET /admin/orders/summary."""
    return await AdminManagementService(db).orders_admin_summary()


@router.get(
    "/prescriptions/summary",
    response_model=PrescriptionAdminSummary,
    dependencies=[Depends(require_any_admin())],
)
async def prescriptions_summary(db: AsyncSession = Depends(get_db)):
    """Platform prescription workflow counts — same data as GET /admin/prescriptions/summary."""
    return await AdminManagementService(db).prescription_summary()


@router.get(
    "/products/patient-catalog",
    response_model=PatientCatalogInsights,
    dependencies=[Depends(require_any_admin())],
)
async def patient_catalog_insights(db: AsyncSession = Depends(get_db)):
    """Patient-visible active listings by product type (Rx vs OTC)."""
    return await AdminManagementService(db).patient_catalog_insights()


@router.get("/pharmacy/{pharmacy_id}")
async def pharmacy_stats(
    pharmacy_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).pharmacy_stats(pharmacy_id)
