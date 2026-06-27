from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.models.partner import PartnerCompany
from app.schemas.partner import (
    PartnerCompanyOut,
    PartnerCompanyPublicOut,
    PartnerCompanyCreate,
    PartnerCompanyUpdate,
    PartnerCompanyAdminUpdate,
)
from app.core.constants import EntityStatus
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError, AuthorizationError

router = APIRouter()


def _partner_out(company: PartnerCompany) -> PartnerCompanyOut:
    from app.services.seller_commission import (
        commission_rate_source,
        effective_commission_rate_percent,
    )

    stored = (
        float(company.commission_rate_percent)
        if company.commission_rate_percent is not None
        else None
    )
    out = PartnerCompanyOut.model_validate(company)
    return out.model_copy(
        update={
            "effective_commission_rate_percent": effective_commission_rate_percent(stored),
            "commission_rate_source": commission_rate_source(stored),
        }
    )


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
    return _partner_out(company)


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
    payload = data.model_dump(exclude_unset=True)
    payload.pop("commission_rate_percent", None)
    payload.pop("verification_status", None)
    payload.pop("status", None)
    for field, value in payload.items():
        setattr(company, field, value)
    if "logo_url" in payload:
        from app.services.seller_branding import sync_partner_logo_to_pharmacies

        await sync_partner_logo_to_pharmacies(db, company)
    await db.commit()
    await db.refresh(company)
    return _partner_out(company)


@router.get("/public/", response_model=PaginatedResponse[PartnerCompanyPublicOut])
async def list_public_partners(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Active healthcare companies / distributors visible on the patient store."""
    cond = and_(
        PartnerCompany.status == EntityStatus.ACTIVE,
        PartnerCompany.is_open.is_(True),
    )
    total = (
        await db.execute(select(func.count(PartnerCompany.id)).where(cond))
    ).scalar_one()
    result = await db.execute(
        select(PartnerCompany).where(cond).order_by(PartnerCompany.name).offset(offset).limit(limit)
    )
    items = list(result.scalars().all())
    return PaginatedResponse(
        items=[PartnerCompanyPublicOut.model_validate(p) for p in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/public/{partner_id}", response_model=PartnerCompanyPublicOut)
async def get_public_partner(partner_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PartnerCompany).where(
            PartnerCompany.id == partner_id,
            PartnerCompany.status == EntityStatus.ACTIVE,
            PartnerCompany.is_open.is_(True),
        )
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner", partner_id)
    return PartnerCompanyPublicOut.model_validate(partner)


@router.get("/", response_model=PaginatedResponse[PartnerCompanyOut])
async def list_partners(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    verification_status: str | None = Query(None),
    status: str | None = Query(None),
    applications_only: bool = Query(False, description="Self-service partner applications awaiting review"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.FINANCE_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        )
    ),
):
    from app.core.constants import VerificationStatus

    conds = []
    if verification_status:
        conds.append(PartnerCompany.verification_status == verification_status)
    if status:
        conds.append(PartnerCompany.status == status)
    if applications_only:
        conds.append(
            and_(
                PartnerCompany.status == EntityStatus.INACTIVE,
                PartnerCompany.verification_status.in_(
                    [VerificationStatus.PENDING, VerificationStatus.UNVERIFIED]
                ),
            )
        )
    filter_cond = and_(*conds) if conds else None

    count_q = select(func.count(PartnerCompany.id))
    list_q = select(PartnerCompany).order_by(PartnerCompany.created_at.desc()).offset(offset).limit(limit)
    if filter_cond is not None:
        count_q = count_q.where(filter_cond)
        list_q = list_q.where(filter_cond)

    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(list_q)
    items = [_partner_out(p) for p in result.scalars().all()]
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{partner_id}", response_model=PartnerCompanyOut)
async def get_partner(
    partner_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.FINANCE_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        )
    ),
):
    result = await db.execute(select(PartnerCompany).where(PartnerCompany.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner", partner_id)
    return partner


@router.put("/{partner_id}", response_model=PartnerCompanyOut)
async def update_partner(
    partner_id: str,
    data: PartnerCompanyAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        )
    ),
):
    result = await db.execute(select(PartnerCompany).where(PartnerCompany.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundError("Partner", partner_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(partner, field, value)
    await db.commit()
    await db.refresh(partner)
    return _partner_out(partner)

# ---- Phase 3: /me/listings ----
from app.schemas.product import ProductListingCreate, ProductListingOut, ProductListingUpdate
from app.services.product_service import ProductService


async def _get_my_partner(db: AsyncSession, current_user: User) -> PartnerCompany:
    from app.services.partner_access import resolve_user_partner

    company = await resolve_user_partner(db, current_user)
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
    items, total = await ProductService(db).list_listings_for_owner(
        current_user.id, offset=offset, limit=limit
    )
    # Eagerly serialize ORM objects into Pydantic models while session is still open
    # (ensures nested product relationship is captured before session closes)
    items_out = [ProductListingOut.model_validate(item) for item in items]
    return PaginatedResponse(items=items_out, total=total, offset=offset, limit=limit)


@router.post("/me/listings", response_model=ProductListingOut, status_code=201)
async def create_my_partner_listing(
    data: ProductListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    company = await _get_my_partner(db, current_user)
    payload = data.model_copy(update={"partner_company_id": company.id, "pharmacy_id": None})
    return await ProductService(db).create_listing(payload, current_user)


@router.patch("/me/listings/{listing_id}", response_model=ProductListingOut)
async def update_my_partner_listing(
    listing_id: str,
    data: ProductListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    company = await _get_my_partner(db, current_user)
    listing = await ProductService(db).get_listing(listing_id)
    if listing.partner_company_id != company.id:
        raise AuthorizationError("This listing does not belong to your partner company")
    return await ProductService(db).update_listing(listing_id, data, current_user)


@router.delete("/me/listings/{listing_id}", status_code=204)
async def delete_my_partner_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    company = await _get_my_partner(db, current_user)
    listing = await ProductService(db).get_listing(listing_id)
    if listing.partner_company_id != company.id:
        raise AuthorizationError("This listing does not belong to your partner company")
    await ProductService(db).delete_listing(listing_id, current_user)


# ---- Phase 6: /me/orders ----
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.services.order_service import OrderService


@router.get("/me/orders", response_model=PaginatedResponse[OrderOut])
async def list_my_partner_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    from_date: str = Query(None, description="ISO-8601 date to filter orders created on or after this date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    from datetime import datetime, timezone
    parsed_from = None
    if from_date:
        try:
            parsed_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    items, total = await OrderService(db).list_partner_orders(
        current_user, offset=offset, limit=limit, status=status, from_date=parsed_from
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.patch("/me/orders/{order_id}/status", response_model=OrderOut)
async def update_my_partner_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    return await OrderService(db).update_status(order_id, data, current_user)


# ---- Phase 8.2: /me/revenue and /me/withdrawals ----
from app.schemas.revenue import (
    RevenueRecordOut,
    RevenueSummary,
    WithdrawalAmountRequest,
    WithdrawalOut,
)
from app.services.revenue_service import RevenueService


@router.get("/me/revenue", response_model=list[RevenueRecordOut])
async def list_my_partner_revenue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    records = await RevenueService(db).list_records_for_owner(current_user.id)
    return RevenueService.records_to_out(records)


@router.get("/me/revenue/summary", response_model=RevenueSummary)
async def get_my_partner_revenue_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    return await RevenueService(db).get_summary_for_owner(current_user.id)


@router.get("/me/withdrawals", response_model=list[WithdrawalOut])
async def list_my_partner_withdrawals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    return await RevenueService(db).list_withdrawals_for_owner(current_user.id)


@router.post("/me/withdrawals", response_model=WithdrawalOut, status_code=201)
async def create_my_partner_withdrawal(
    data: WithdrawalAmountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PARTNER_COMPANY_ADMIN)),
):
    withdrawal = await RevenueService(db).request_withdrawal_for_owner(
        data=data,
        actor=current_user,
    )
    return withdrawal
