from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.models.partner import PartnerCompany
from app.schemas.partner import PartnerCompanyOut, PartnerCompanyCreate, PartnerCompanyUpdate
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError, AuthorizationError

router = APIRouter()


def _assert_owner(company: PartnerCompany, current_user: User) -> None:
    if current_user.role == UserRole.SUPER_ADMIN:
        return
    if company.owner_user_id != current_user.id:
        raise AuthorizationError("You do not own this partner company")


@router.post("/", response_model=PartnerCompanyOut, status_code=201)
async def create_partner(
    data: PartnerCompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN, UserRole.SUPER_ADMIN)),
):
    partner = PartnerCompany(**data.model_dump(), owner_user_id=current_user.id)
    db.add(partner)
    await db.commit()
    await db.refresh(partner)
    return partner


@router.get("/me", response_model=PartnerCompanyOut)
async def get_my_company(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN, UserRole.SUPER_ADMIN)),
):
    result = await db.execute(
        select(PartnerCompany).where(PartnerCompany.owner_user_id == current_user.id)
    )
    company = result.scalars().first()
    if not company:
        raise NotFoundError("Partner company")
    return company


@router.patch("/me", response_model=PartnerCompanyOut)
async def update_my_company(
    data: PartnerCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN, UserRole.SUPER_ADMIN)),
):
    result = await db.execute(
        select(PartnerCompany).where(PartnerCompany.owner_user_id == current_user.id)
    )
    company = result.scalars().first()
    if not company:
        raise NotFoundError("Partner company")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/", response_model=PaginatedResponse[PartnerCompanyOut])
async def list_partners(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count(PartnerCompany.id)))).scalar_one()
    result = await db.execute(select(PartnerCompany).offset(offset).limit(limit))
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get("/{partner_id}", response_model=PartnerCompanyOut)
async def get_partner(partner_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PartnerCompany).where(PartnerCompany.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner", partner_id)
    return partner


@router.put("/{partner_id}", response_model=PartnerCompanyOut)
async def update_partner(
    partner_id: str,
    data: PartnerCompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PartnerCompany).where(PartnerCompany.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner", partner_id)
    _assert_owner(partner, current_user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(partner, field, value)
    await db.commit()
    await db.refresh(partner)
    return partner

# ---- Phase 3: /me/listings ----
from app.schemas.product import ProductListingCreate, ProductListingOut
from app.services.product_service import ProductService


async def _get_my_partner(db: AsyncSession, current_user: User) -> PartnerCompany:
    result = await db.execute(
        select(PartnerCompany).where(PartnerCompany.owner_user_id == current_user.id)
    )
    company = result.scalars().first()
    if not company:
        raise NotFoundError("PartnerCompany")
    return company


@router.get("/me/listings", response_model=PaginatedResponse[ProductListingOut])
async def list_my_partner_listings(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    company = await _get_my_partner(db, current_user)
    items, total = await ProductService(db).list_listings(
        offset=offset, limit=limit, partner_company_id=company.id
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/me/listings", response_model=ProductListingOut, status_code=201)
async def create_my_partner_listing(
    data: ProductListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    company = await _get_my_partner(db, current_user)
    payload = data.model_copy(update={"partner_company_id": company.id, "pharmacy_id": None})
    return await ProductService(db).create_listing(payload, current_user)
