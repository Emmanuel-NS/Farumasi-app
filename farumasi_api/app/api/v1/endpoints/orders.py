from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.delivery import DeliveryOut
from app.schemas.order import (
    OrderActivityEntry,
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
    PaymentStatusUpdate,
    SetRiderAccessCodeRequest,
    VerifyAccessCodeRequest,
)
from app.services.delivery_service import DeliveryService
from app.services.order_service import OrderService

router = APIRouter()


@router.post("/", response_model=OrderOut, status_code=201)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).create_order(data, actor)


@router.get("/", response_model=PaginatedResponse[OrderOut])
async def list_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    bucket: Optional[str] = Query(
        None,
        description="High-level filter: pending | in_progress | completed | cancelled",
    ),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Role-scoped paginated listing.

    - Platform admins: all orders (optional ``bucket`` or ``status`` filter)
    - PATIENT: own orders
    - PHARMACY_ADMIN: orders for the pharmacy they own
    - PARTNER_COMPANY_ADMIN: orders for the partner company they own
    """
    items, total = await OrderService(db).list_all_orders(
        actor, offset=offset, limit=limit, status=status, bucket=bucket
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/my", response_model=PaginatedResponse[OrderOut])
async def my_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    items, total = await OrderService(db).list_patient_orders(
        actor, offset=offset, limit=limit
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/pharmacy/all", response_model=PaginatedResponse[OrderOut])
async def pharmacy_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    items, total = await OrderService(db).list_pharmacy_orders(
        actor, offset=offset, limit=limit, status=status
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{order_id}/activity", response_model=list[OrderActivityEntry])
async def get_order_activity(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Status-change and related audit events for one order."""
    rows = await OrderService(db).list_order_activity(order_id, actor)
    return [OrderActivityEntry(**r) for r in rows]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).get_order(order_id, actor)


@router.get("/{order_id}/delivery", response_model=Optional[DeliveryOut])
async def get_order_delivery(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Return the delivery row attached to this order (or ``null`` if none).

    Authorisation: patient owner, pharmacy/partner staff, assigned rider,
    or super-admin. Used by patient & pharmacist portals to track delivery
    progress and assigned rider without needing the delivery_id.
    """
    # Ensure the order is visible to the caller using the same ACL as get_order.
    await OrderService(db).get_order(order_id, actor)
    return await DeliveryService(db).get_by_order(order_id, actor)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).update_status(order_id, data, actor)


@router.patch("/{order_id}/payment-status", response_model=OrderOut)
async def update_payment_status(
    order_id: str,
    data: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).update_payment_status(order_id, data, actor)


@router.patch("/{order_id}/payment", response_model=OrderOut)
async def update_payment_status_alias(
    order_id: str,
    data: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Backward-compatible alias for ``/payment-status``."""
    return await OrderService(db).update_payment_status(order_id, data, actor)


@router.patch("/{order_id}/rider-code", response_model=OrderOut)
async def set_rider_access_code(
    order_id: str,
    data: SetRiderAccessCodeRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Farumasi pharmacist sets a rider access code so the rider can pick up
    medicines from the partner pharmacy."""
    return await OrderService(db).set_rider_access_code(order_id, data, actor)


@router.post("/{order_id}/verify-access-code", response_model=OrderOut)
async def verify_access_code(
    order_id: str,
    data: VerifyAccessCodeRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Verify patient access code to complete pickup (→ completed) or
    confirm delivery received (→ delivered)."""
    return await OrderService(db).verify_access_code(order_id, data, actor)
