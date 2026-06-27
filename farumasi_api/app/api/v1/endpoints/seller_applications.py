from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.upload_service import UploadService

from app.core.database import get_db
from app.core.constants import UserRole
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.common import PaginatedResponse
from app.schemas.seller_application import (
    SellerApplicationOut,
    SellerApplicationReview,
    SellerApplicationSubmit,
    SellerApplicationSubmitResponse,
    SellerApplicationVerifyRequest,
    SellerDraftPartnerOut,
    SellerDraftPharmacyOut,
)
from app.services.seller_application_service import SellerApplicationService

router = APIRouter()

_ADMIN_ROLES = (
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.COMPLIANCE_ADMIN,
    UserRole.PHARMACIST,
)


@router.post("/uploads/image")
async def upload_application_image(file: UploadFile = File(...)):
    """Public: logo or storefront photo for seller applications (before account exists)."""
    try:
        url = await UploadService().upload_image(file, folder="seller-applications")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"url": url}


@router.post("/uploads/document")
async def upload_application_document(file: UploadFile = File(...)):
    """Public: license or regulatory document for seller applications."""
    try:
        url = await UploadService().upload_document(file, folder="seller-applications")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"url": url}


@router.get("/drafts/pharmacies", response_model=List[SellerDraftPharmacyOut])
async def list_pharmacy_drafts(db: AsyncSession = Depends(get_db)):
    """Public: pharmacist-drafted pharmacies open for owner application."""
    return await SellerApplicationService(db).list_pharmacy_drafts()


@router.get("/drafts/partners", response_model=List[SellerDraftPartnerOut])
async def list_partner_drafts(db: AsyncSession = Depends(get_db)):
    return await SellerApplicationService(db).list_partner_drafts()


@router.post("/submit", response_model=SellerApplicationSubmitResponse, status_code=201)
async def submit_application(
    data: SellerApplicationSubmit,
    db: AsyncSession = Depends(get_db),
):
    return await SellerApplicationService(db).submit(data)


@router.post("/verify", response_model=TokenResponse)
async def verify_application(
    data: SellerApplicationVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    return await SellerApplicationService(db).verify(data)


@router.get("/me", response_model=SellerApplicationOut | None)
async def get_my_application(
    current_user: User = Depends(
        require_roles(UserRole.PHARMACY_ADMIN, UserRole.PARTNER_COMPANY_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    return await SellerApplicationService(db).get_my_application(current_user)


@router.get("/", response_model=PaginatedResponse[SellerApplicationOut])
async def list_applications(
    status: Optional[str] = Query(None),
    seller_type: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _actor: User = Depends(require_roles(*_ADMIN_ROLES)),
):
    items, total = await SellerApplicationService(db).list_applications(
        status=status, seller_type=seller_type, offset=offset, limit=limit
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.patch("/{application_id}/review", response_model=SellerApplicationOut)
async def review_application(
    application_id: str,
    data: SellerApplicationReview,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(*_ADMIN_ROLES)),
):
    return await SellerApplicationService(db).review(
        application_id,
        status=data.status,
        review_notes=data.review_notes,
        actor=actor,
    )
