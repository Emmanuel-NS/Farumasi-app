from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.schemas.analytics import AdminSummaryOut
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/admin", response_model=AdminSummaryOut, dependencies=[Depends(require_super_admin())])
async def admin_summary(db: AsyncSession = Depends(get_db)):
    return await AnalyticsService(db).admin_summary()


@router.get("/pharmacy/{pharmacy_id}")
async def pharmacy_stats(
    pharmacy_id: str,
    db: AsyncSession = Depends(get_db),
):
    return await AnalyticsService(db).pharmacy_stats(pharmacy_id)
