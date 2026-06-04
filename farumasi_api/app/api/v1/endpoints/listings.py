"""Phase-3 product listing endpoints (top-level /listings)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    ListingAvailabilityUpdate,
    ProductListingCreate,
    ProductListingOut,
    ProductListingUpdate,
)
from app.services.product_service import ProductService, listing_to_out

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[ProductListingOut])
async def list_listings(
    pharmacy_id: Optional[str] = Query(None),
    partner_company_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    availability_status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await ProductService(db).list_listings(
        offset=offset,
        limit=limit,
        pharmacy_id=pharmacy_id,
        partner_company_id=partner_company_id,
        product_id=product_id,
        availability_status=availability_status,
    )
    return PaginatedResponse(
        items=[listing_to_out(i) for i in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post("/", response_model=ProductListingOut, status_code=201)
async def create_listing(
    data: ProductListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).create_listing(data, current_user)


@router.get("/{listing_id}", response_model=ProductListingOut)
async def get_listing(listing_id: str, db: AsyncSession = Depends(get_db)):
    listing = await ProductService(db).get_listing(listing_id)
    return listing_to_out(listing)


@router.patch("/{listing_id}", response_model=ProductListingOut)
async def update_listing(
    listing_id: str,
    data: ProductListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).update_listing(listing_id, data, current_user)


@router.patch("/{listing_id}/availability", response_model=ProductListingOut)
async def set_listing_availability(
    listing_id: str,
    data: ListingAvailabilityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await ProductService(db).set_listing_availability(
        listing_id, data.availability_status, current_user
    )


@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await ProductService(db).delete_listing(listing_id, current_user)
