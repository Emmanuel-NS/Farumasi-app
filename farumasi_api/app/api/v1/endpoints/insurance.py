"""Phase-3 insurance provider endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles, require_super_admin
from app.models.insurance import InsuranceProvider
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.insurance import (
    InsuranceProviderCreate,
    InsuranceProviderOut,
    InsuranceProviderUpdate,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[InsuranceProviderOut])
async def list_providers(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count(InsuranceProvider.id)))).scalar_one()
    result = await db.execute(
        select(InsuranceProvider).order_by(InsuranceProvider.name).offset(offset).limit(limit)
    )
    return PaginatedResponse(
        items=list(result.scalars().all()), total=total, offset=offset, limit=limit
    )


@router.post("/", response_model=InsuranceProviderOut, status_code=201)
async def create_provider(
    data: InsuranceProviderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin()),
):
    provider = InsuranceProvider(
        name=data.name,
        insurance_type=data.insurance_type,
        status=data.status or "active",
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return provider


@router.get("/{provider_id}", response_model=InsuranceProviderOut)
async def get_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(InsuranceProvider).where(InsuranceProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise NotFoundError("InsuranceProvider", provider_id)
    return provider


@router.patch("/{provider_id}", response_model=InsuranceProviderOut)
async def update_provider(
    provider_id: str,
    data: InsuranceProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin()),
):
    result = await db.execute(
        select(InsuranceProvider).where(InsuranceProvider.id == provider_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise NotFoundError("InsuranceProvider", provider_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)
    await db.commit()
    await db.refresh(provider)
    return provider
