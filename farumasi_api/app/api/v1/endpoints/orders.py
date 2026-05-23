from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.order import Order
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.schemas.order import OrderOut, OrderCreate, OrderStatusUpdate, PaymentStatusUpdate
from app.schemas.common import PaginatedResponse
from app.services.order_service import OrderService

router = APIRouter()


@router.post("/", response_model=OrderOut, status_code=201)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).create_order(data, actor)


@router.get("/my", response_model=PaginatedResponse[OrderOut])
async def my_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    pat_result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == actor.id))
    patient = pat_result.scalar_one_or_none()
    if not patient:
        return PaginatedResponse(items=[], total=0, offset=offset, limit=limit)

    total = (await db.execute(select(func.count(Order.id)).where(Order.patient_id == patient.id))).scalar_one()
    result = await db.execute(
        select(Order).where(Order.patient_id == patient.id).options(selectinload(Order.items)).offset(offset).limit(limit)
    )
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get("/pharmacy/all", response_model=PaginatedResponse[OrderOut])
async def all_orders_for_pharmacist(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Pharmacist sees ALL orders (or filtered by pharmacy if they own one)."""
    # Find pharmacy owned by this user
    pharm_result = await db.execute(select(Pharmacy).where(Pharmacy.owner_user_id == actor.id))
    pharmacy = pharm_result.scalar_one_or_none()

    conditions = []
    if pharmacy:
        conditions.append(Order.pharmacy_id == pharmacy.id)
    if status:
        conditions.append(Order.order_status == status)

    count_q = select(func.count(Order.id))
    if conditions:
        count_q = count_q.where(*conditions)
    total = (await db.execute(count_q)).scalar_one()

    q = select(Order).options(selectinload(Order.items))
    if conditions:
        q = q.where(*conditions)
    q = q.order_by(Order.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return PaginatedResponse(items=list(result.scalars().all()), total=total, offset=offset, limit=limit)


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.core.exceptions import NotFoundError
    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundError("Order", order_id)
    return order


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).update_status(order_id, data, actor)


@router.patch("/{order_id}/payment", response_model=OrderOut)
async def update_payment_status(
    order_id: str,
    data: PaymentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await OrderService(db).update_payment_status(order_id, data, actor)
