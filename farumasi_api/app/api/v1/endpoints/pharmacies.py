from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user, get_optional_current_user
from app.dependencies.roles import require_roles
from app.core.constants import EntityStatus, UserRole
from app.models.user import User
from app.models.pharmacy import Pharmacy
from app.schemas.pharmacy import PharmacyOut, PharmacyCreate, PharmacyUpdate, PharmacyAdminUpdate
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError, AuthorizationError, AuthenticationError

router = APIRouter()

_ADMIN_PHARMACY_ROLES = (
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_ADMIN,
    UserRole.COMPLIANCE_ADMIN,
)

# Pharmacists need read-only directory access for cross-pharmacy inventory views.
_PHARMACY_LIST_ROLES = _ADMIN_PHARMACY_ROLES + (
    UserRole.PHARMACIST,
    UserRole.PHARMACY_ADMIN,
)


def _pharmacy_out(pharmacy: Pharmacy) -> PharmacyOut:
    from app.services.seller_commission import (
        commission_rate_source,
        effective_commission_rate_percent,
    )

    stored = (
        float(pharmacy.commission_rate_percent)
        if pharmacy.commission_rate_percent is not None
        else None
    )
    out = PharmacyOut.model_validate(pharmacy)
    return out.model_copy(
        update={
            "effective_commission_rate_percent": effective_commission_rate_percent(stored),
            "commission_rate_source": commission_rate_source(stored),
        }
    )


def _assert_owner(pharmacy: Pharmacy, current_user: User) -> None:
    """Raise 403 unless caller owns the pharmacy or is super_admin."""
    if current_user.role == UserRole.SUPER_ADMIN:
        return
    if pharmacy.owner_user_id != current_user.id:
        raise AuthorizationError("You do not own this pharmacy")


@router.post("/", response_model=PharmacyOut, status_code=201)
async def create_pharmacy(
    data: PharmacyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    pharmacy = Pharmacy(**data.model_dump(), owner_user_id=current_user.id)
    db.add(pharmacy)
    await db.commit()
    await db.refresh(pharmacy)
    return pharmacy


async def _load_pharmacy_out(db: AsyncSession, pharmacy_id: str) -> PharmacyOut:
    """Eager-load relationships to avoid async lazy-load 500s in PharmacyOut."""
    result = await db.execute(
        select(Pharmacy)
        .options(
            selectinload(Pharmacy.accepted_insurances),
            selectinload(Pharmacy.owner),
        )
        .where(Pharmacy.id == pharmacy_id)
    )
    pharmacy = result.scalar_one_or_none()
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    return _pharmacy_out(pharmacy)


@router.get("/me", response_model=PharmacyOut)
async def get_my_pharmacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)),
):
    from app.services.pharmacy_access import resolve_user_pharmacy

    pharmacy = await resolve_user_pharmacy(db, current_user)
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    return await _load_pharmacy_out(db, pharmacy.id)


@router.patch("/me", response_model=PharmacyOut)
async def update_my_pharmacy(
    data: PharmacyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)),
):
    from app.services.pharmacy_access import resolve_user_pharmacy

    pharmacy = await resolve_user_pharmacy(db, current_user)
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pharmacy, field, value)
    await db.commit()
    return await _load_pharmacy_out(db, pharmacy.id)


@router.get("/", response_model=PaginatedResponse[PharmacyOut])
async def list_pharmacies(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    open_only: bool = Query(False, description="When true, only sellers open for patient orders"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    if not open_only:
        if current_user is None:
            raise AuthenticationError("Authentication credentials not provided")
        if current_user.role not in _PHARMACY_LIST_ROLES:
            raise AuthorizationError("Not allowed to list all pharmacies")
    from sqlalchemy import func
    filters = []
    if open_only:
        filters.extend([Pharmacy.status == EntityStatus.ACTIVE, Pharmacy.is_open.is_(True)])
    count_q = select(func.count(Pharmacy.id))
    data_q = (
        select(Pharmacy)
        .options(
            selectinload(Pharmacy.owner),
            selectinload(Pharmacy.accepted_insurances),
        )
        .order_by(Pharmacy.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    if filters:
        count_q = count_q.where(*filters)
        data_q = data_q.where(*filters)
    total = (await db.execute(count_q)).scalar_one()
    result = await db.execute(data_q)
    rows = list(result.scalars().all())
    owner_ids = list({p.owner_user_id for p in rows if p.owner_user_id and not p.logo_url})
    if owner_ids:
        from app.services.seller_branding import load_partner_logo_index, resolve_pharmacy_logo

        logo_index = await load_partner_logo_index(db, owner_ids)
        items = []
        for pharmacy in rows:
            out = PharmacyOut.model_validate(pharmacy)
            resolved = resolve_pharmacy_logo(pharmacy, logo_index)
            if resolved and not out.logo_url:
                out = out.model_copy(update={"logo_url": resolved})
            items.append(out)
    else:
        items = [PharmacyOut.model_validate(p) for p in rows]
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{pharmacy_id}", response_model=PharmacyOut)
async def get_pharmacy(
    pharmacy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_ADMIN_PHARMACY_ROLES)),
):
    result = await db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
    pharmacy = result.scalar_one_or_none()
    if not pharmacy:
        raise NotFoundError("Pharmacy", pharmacy_id)
    return pharmacy


@router.put("/{pharmacy_id}", response_model=PharmacyOut)
async def update_pharmacy(
    pharmacy_id: str,
    data: PharmacyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
    pharmacy = result.scalar_one_or_none()
    if not pharmacy:
        raise NotFoundError("Pharmacy", pharmacy_id)
    _assert_owner(pharmacy, current_user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pharmacy, field, value)
    await db.commit()
    await db.refresh(pharmacy)
    return pharmacy


@router.patch(
    "/{pharmacy_id}/admin",
    response_model=PharmacyOut,
    dependencies=[Depends(require_roles(*_ADMIN_PHARMACY_ROLES))],
)
async def admin_update_pharmacy(
    pharmacy_id: str,
    data: PharmacyAdminUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
    pharmacy = result.scalar_one_or_none()
    if not pharmacy:
        raise NotFoundError("Pharmacy", pharmacy_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pharmacy, field, value)
    await db.commit()
    return await _load_pharmacy_out(db, pharmacy_id)



# ---- Phase 3: /me/listings ----
from app.schemas.product import ProductListingCreate, ProductListingOut, ProductListingUpdate
from app.services.product_service import ProductService


async def _get_my_pharmacy(db: AsyncSession, current_user: User) -> Pharmacy:
    from app.services.pharmacy_access import resolve_user_pharmacy

    pharmacy = await resolve_user_pharmacy(db, current_user)
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    return pharmacy


@router.get("/me/listings", response_model=PaginatedResponse[ProductListingOut])
async def list_my_listings(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    items, total = await ProductService(db).list_listings(
        offset=offset, limit=limit, pharmacy_id=pharmacy.id
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/me/listings", response_model=ProductListingOut, status_code=201)
async def create_my_listing(
    data: ProductListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    payload = data.model_copy(update={"pharmacy_id": pharmacy.id, "partner_company_id": None})
    return await ProductService(db).create_listing(payload, current_user)


@router.patch("/me/listings/{listing_id}", response_model=ProductListingOut)
async def update_my_listing(
    listing_id: str,
    data: ProductListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    listing = await ProductService(db).get_listing(listing_id)
    if listing.pharmacy_id != pharmacy.id:
        raise AuthorizationError("This listing does not belong to your pharmacy")
    return await ProductService(db).update_listing(listing_id, data, current_user)


@router.delete("/me/listings/{listing_id}", status_code=204)
async def delete_my_listing(
    listing_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    listing = await ProductService(db).get_listing(listing_id)
    if listing.pharmacy_id != pharmacy.id:
        raise AuthorizationError("This listing does not belong to your pharmacy")
    await ProductService(db).delete_listing(listing_id, current_user)


# ---- Phase 6: /me/orders ----
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.services.order_service import OrderService


@router.get("/me/orders", response_model=PaginatedResponse[OrderOut])
async def list_my_pharmacy_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    from_date: str = Query(None, description="ISO-8601 date to filter orders created on or after this date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    from datetime import datetime
    parsed_from = None
    if from_date:
        try:
            parsed_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except ValueError:
            pass
    items, total = await OrderService(db).list_pharmacy_orders(
        current_user, offset=offset, limit=limit, status=status, from_date=parsed_from
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.patch("/me/orders/{order_id}/status", response_model=OrderOut)
async def update_my_pharmacy_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
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
async def list_my_pharmacy_revenue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).list_records(pharmacy_id=pharmacy.id)


@router.get("/me/revenue/summary", response_model=RevenueSummary)
async def get_my_pharmacy_revenue_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).get_summary(pharmacy_id=pharmacy.id)


@router.get("/me/withdrawals", response_model=list[WithdrawalOut])
async def list_my_pharmacy_withdrawals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).list_withdrawals(pharmacy_id=pharmacy.id)


@router.post("/me/withdrawals", response_model=WithdrawalOut, status_code=201)
async def create_my_pharmacy_withdrawal(
    data: WithdrawalAmountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).request_withdrawal(
        data=data,
        actor=current_user,
        pharmacy_id=pharmacy.id,
        partner_company_id=None,
    )


# ---- Fleet: drivers & deliveries scoped to my pharmacy ----
from app.schemas.fleet import PharmacyDriverOut
from app.schemas.delivery import DeliveryOut
from app.models.rider import RiderProfile
from app.models.delivery import Delivery
from app.models.order import Order
from sqlalchemy import func as sa_func, case as sa_case


@router.get("/me/drivers", response_model=list[PharmacyDriverOut])
async def list_my_pharmacy_drivers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    completed_expr = sa_func.sum(
        sa_case((Delivery.status == "delivered", 1), else_=0)
    )
    stmt = (
        select(
            RiderProfile,
            User,
            sa_func.count(Delivery.id).label("deliveries_count"),
            completed_expr.label("completed_count"),
            sa_func.max(Delivery.created_at).label("last_delivery_at"),
        )
        .join(Delivery, Delivery.rider_id == RiderProfile.id)
        .join(Order, Order.id == Delivery.order_id)
        .join(User, User.id == RiderProfile.user_id)
        .where(Order.pharmacy_id == pharmacy.id)
        .group_by(RiderProfile.id, User.id)
        .order_by(sa_func.max(Delivery.created_at).desc())
    )
    rows = (await db.execute(stmt)).all()
    out: list[PharmacyDriverOut] = []
    for rider, user, deliveries_count, completed_count, last_at in rows:
        out.append(
            PharmacyDriverOut(
                rider_id=rider.id,
                user_id=user.id,
                full_name=user.full_name,
                phone=user.phone,
                vehicle_type=rider.vehicle_type,
                assigned_area=rider.assigned_area,
                availability_status=rider.availability_status,
                verification_status=rider.verification_status,
                deliveries_count=int(deliveries_count or 0),
                completed_count=int(completed_count or 0),
                last_delivery_at=last_at,
            )
        )
    return out


@router.get("/me/deliveries", response_model=list[DeliveryOut])
async def list_my_pharmacy_deliveries(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    stmt = (
        select(Delivery)
        .join(Order, Order.id == Delivery.order_id)
        .where(Order.pharmacy_id == pharmacy.id)
        .order_by(Delivery.created_at.desc())
    )
    if status:
        stmt = stmt.where(Delivery.status == status)
    rows = (await db.execute(stmt)).scalars().all()
    return list(rows)

