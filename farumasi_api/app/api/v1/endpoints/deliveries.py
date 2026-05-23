from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.delivery import Delivery
from app.schemas.delivery import DeliveryOut, DeliveryAssignRequest, DeliveryStatusUpdate, QRConfirmRequest
from app.services.delivery_service import DeliveryService
from app.core.exceptions import NotFoundError

router = APIRouter()


@router.post("/assign", response_model=DeliveryOut)
async def assign_delivery(
    data: DeliveryAssignRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).assign_delivery(data, actor)


@router.get("/{delivery_id}", response_model=DeliveryOut)
async def get_delivery(delivery_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise NotFoundError("Delivery", delivery_id)
    return delivery


@router.patch("/{delivery_id}/status", response_model=DeliveryOut)
async def update_delivery_status(
    delivery_id: str,
    data: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).update_status(delivery_id, data, actor)


@router.post("/{delivery_id}/confirm-qr", response_model=DeliveryOut)
async def confirm_qr(
    delivery_id: str,
    data: QRConfirmRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).confirm_qr(delivery_id, data, actor)
