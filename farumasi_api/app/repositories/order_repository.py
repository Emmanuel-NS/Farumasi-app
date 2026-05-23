from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem
from app.models.delivery import Delivery
from app.repositories.base import BaseRepository


class OrderRepository(BaseRepository[Order]):
    model = Order

    async def get_with_items(self, order_id: str) -> Optional[Order]:
        result = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items), selectinload(Order.delivery))
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, order_code: str) -> Optional[Order]:
        result = await self.db.execute(
            select(Order).where(Order.order_code == order_code)
        )
        return result.scalar_one_or_none()

    async def get_by_patient(self, patient_id: str) -> List[Order]:
        result = await self.db.execute(
            select(Order)
            .where(Order.patient_id == patient_id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_pharmacy(self, pharmacy_id: str) -> List[Order]:
        result = await self.db.execute(
            select(Order)
            .where(Order.pharmacy_id == pharmacy_id)
            .options(selectinload(Order.items))
            .order_by(Order.created_at.desc())
        )
        return list(result.scalars().all())


class DeliveryRepository(BaseRepository[Delivery]):
    model = Delivery

    async def get_by_qr_token(self, token: str) -> Optional[Delivery]:
        result = await self.db.execute(
            select(Delivery).where(Delivery.qr_token == token)
        )
        return result.scalar_one_or_none()

    async def get_by_rider(self, rider_id: str) -> List[Delivery]:
        result = await self.db.execute(
            select(Delivery)
            .where(Delivery.rider_id == rider_id)
            .order_by(Delivery.created_at.desc())
        )
        return list(result.scalars().all())
