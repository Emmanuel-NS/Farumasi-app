"""Phase-3 product catalogue endpoints (catalogue only — listings/requests have their own routers)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ProductCreate,
    ProductOut,
    ProductStatusUpdate,
    ProductUpdate,
)
from app.services.product_service import ProductService

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_unapproved: bool = Query(False, description="Manager-only filter"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await ProductService(db).list_products(
        actor=current_user,
        offset=offset,
        limit=limit,
        search=search,
        category=category,
        include_unapproved=include_unapproved,
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).create_product(data, current_user)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    return await ProductService(db).get_product(product_id)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).update_product(product_id, data, current_user)


@router.patch("/{product_id}/status", response_model=ProductOut)
async def update_product_status(
    product_id: str,
    data: ProductStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).set_product_status(
        product_id, data.approval_status, current_user
    )
