"""Phase-3 product request endpoints."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ProductRequestCreate,
    ProductRequestOut,
    ProductRequestReview,
    ProductRequestUpdate,
)
from app.services.product_service import ProductService

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[ProductRequestOut])
async def list_requests(
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total = await ProductService(db).list_requests(
        actor=current_user, offset=offset, limit=limit, status=status
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/", response_model=ProductRequestOut, status_code=201)
async def create_request(
    data: ProductRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).create_request(data, current_user)


@router.get("/{request_id}", response_model=ProductRequestOut)
async def get_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).get_request(request_id, current_user)


@router.patch("/{request_id}", response_model=ProductRequestOut)
async def update_request(
    request_id: str,
    data: ProductRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).update_request(request_id, data, current_user)


@router.patch("/{request_id}/submit", response_model=ProductRequestOut)
async def submit_request(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).submit_request(request_id, current_user)


@router.patch("/{request_id}/review", response_model=ProductRequestOut)
async def review_request(
    request_id: str,
    data: ProductRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).review_request(request_id, data, current_user)
