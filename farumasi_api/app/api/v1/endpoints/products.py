"""Phase-3 product catalogue endpoints (catalogue only — listings/requests have their own routers)."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user, get_optional_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ProductCategoryCreate,
    ProductCategoryOut,
    ProductCategoryUpdate,
    ProductCreate,
    ProductOut,
    ProductStatusUpdate,
    ProductUpdate,
)
from app.services.product_service import ProductService
from app.core.constants import UserRole

router = APIRouter()

_PHARMACIST_ROLES = {UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATIONS_ADMIN}


# ── Category CRUD (must be registered before /{product_id} wildcard) ─────────

@router.get("/categories/", response_model=List[ProductCategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Return all categories ordered by display_order, name."""
    return await ProductService(db).list_categories()


@router.post("/categories/", response_model=ProductCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: ProductCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in _PHARMACIST_ROLES:
        raise HTTPException(status_code=403, detail="Only pharmacists can manage categories")
    return await ProductService(db).create_category(data)


@router.patch("/categories/{category_id}", response_model=ProductCategoryOut)
async def update_category(
    category_id: str,
    data: ProductCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in _PHARMACIST_ROLES:
        raise HTTPException(status_code=403, detail="Only pharmacists can manage categories")
    return await ProductService(db).update_category(category_id, data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in _PHARMACIST_ROLES:
        raise HTTPException(status_code=403, detail="Only pharmacists can manage categories")
    await ProductService(db).delete_category(category_id)


@router.put("/categories/sync", response_model=List[ProductCategoryOut])
async def sync_categories(
    items: List[ProductCategoryCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk upsert from pharmacist portal. Syncs localStorage state → backend."""
    if current_user.role not in _PHARMACIST_ROLES:
        raise HTTPException(status_code=403, detail="Only pharmacists can manage categories")
    return await ProductService(db).upsert_categories([i.model_dump() for i in items])


@router.get("/", response_model=PaginatedResponse[ProductOut])
async def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    include_unapproved: bool = Query(False, description="Manager-only filter"),
    only_with_listings: bool = Query(True, description="Only return products stocked by at least one active pharmacy/partner"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    items, total = await ProductService(db).list_products(
        actor=current_user,
        offset=offset,
        limit=limit,
        search=search,
        category=category,
        include_unapproved=include_unapproved,
        only_with_listings=only_with_listings,
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
