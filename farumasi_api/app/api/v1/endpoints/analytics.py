from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.roles import require_any_admin
from app.models.user import User
from app.schemas.analytics import AdminSummaryOut
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
