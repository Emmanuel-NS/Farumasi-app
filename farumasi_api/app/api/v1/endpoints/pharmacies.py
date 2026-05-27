from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.models.pharmacy import Pharmacy
from app.schemas.pharmacy import PharmacyOut, PharmacyCreate, PharmacyUpdate
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError, AuthorizationError

router = APIRouter()


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


@router.get("/me", response_model=PharmacyOut)
async def get_my_pharmacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    result = await db.execute(
        select(Pharmacy).where(Pharmacy.owner_user_id == current_user.id)
    )
    pharmacy = result.scalars().first()
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    return pharmacy


@router.patch("/me", response_model=PharmacyOut)
async def update_my_pharmacy(
    data: PharmacyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    result = await db.execute(
        select(Pharmacy).where(Pharmacy.owner_user_id == current_user.id)
    )
    pharmacy = result.scalars().first()
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pharmacy, field, value)
    await db.commit()
    await db.refresh(pharmacy)
    return pharmacy


@router.get("/", response_model=PaginatedResponse[PharmacyOut])
async def list_pharmacies(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    total = (await db.execute(select(func.count(Pharmacy.id)))).scalar_one()
    result = await db.execute(select(Pharmacy).offset(offset).limit(limit))
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get("/{pharmacy_id}", response_model=PharmacyOut)
async def get_pharmacy(pharmacy_id: str, db: AsyncSession = Depends(get_db)):
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



# ---- Phase 3: /me/listings ----
from app.schemas.product import ProductListingCreate, ProductListingOut
from app.services.product_service import ProductService


async def _get_my_pharmacy(db: AsyncSession, current_user: User) -> Pharmacy:
    result = await db.execute(
        select(Pharmacy).where(Pharmacy.owner_user_id == current_user.id)
    )
    pharmacy = result.scalars().first()
    if not pharmacy:
        raise NotFoundError("Pharmacy")
    return pharmacy


@router.get("/me/listings", response_model=PaginatedResponse[ProductListingOut])
async def list_my_listings(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
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
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    payload = data.model_copy(update={"pharmacy_id": pharmacy.id, "partner_company_id": None})
    return await ProductService(db).create_listing(payload, current_user)


# ---- Phase 6: /me/orders ----
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.services.order_service import OrderService


@router.get("/me/orders", response_model=PaginatedResponse[OrderOut])
async def list_my_pharmacy_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    items, total = await OrderService(db).list_pharmacy_orders(
        current_user, offset=offset, limit=limit, status=status
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.patch("/me/orders/{order_id}/status", response_model=OrderOut)
async def update_my_pharmacy_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    return await OrderService(db).update_status(order_id, data, current_user)


# ---- Phase 8.2: /me/revenue and /me/withdrawals ----
from app.schemas.revenue import (
    RevenueRecordOut,
    RevenueSummary,
    WithdrawalCreate,
    WithdrawalOut,
)
from app.services.revenue_service import RevenueService


@router.get("/me/revenue", response_model=list[RevenueRecordOut])
async def list_my_pharmacy_revenue(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).list_records(pharmacy_id=pharmacy.id)


@router.get("/me/revenue/summary", response_model=RevenueSummary)
async def get_my_pharmacy_revenue_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).get_summary(pharmacy_id=pharmacy.id)


@router.get("/me/withdrawals", response_model=list[WithdrawalOut])
async def list_my_pharmacy_withdrawals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
):
    pharmacy = await _get_my_pharmacy(db, current_user)
    return await RevenueService(db).list_withdrawals(pharmacy_id=pharmacy.id)


@router.post("/me/withdrawals", response_model=WithdrawalOut, status_code=201)
async def create_my_pharmacy_withdrawal(
    data: WithdrawalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
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
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
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
    current_user: User = Depends(require_roles(UserRole.PHARMACY_ADMIN)),
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
