from __future__ import annotations

import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.constants import OrderStatus, PaymentStatus, DeliveryMethod, RevenueStatus
from app.core.exceptions import NotFoundError, ValidationError, BusinessRuleError
from app.models.order import Order, OrderItem
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.models.delivery import Delivery
from app.models.revenue import RevenueRecord
from app.repositories.order_repository import OrderRepository
from app.schemas.order import OrderCreate, OrderStatusUpdate, PaymentStatusUpdate
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.user import User


def _generate_order_code() -> str:
    return f"FAR-{uuid.uuid4().hex[:8].upper()}"


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrderRepository(db)

    async def create_order(self, data: OrderCreate, actor: User) -> Order:
        # Resolve patient
        patient_result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        patient = patient_result.scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile")

        subtotal = sum(item.unit_price * item.quantity for item in data.items)
        delivery_fee = 0.0
        if data.delivery_method == DeliveryMethod.DELIVERY:
            delivery_fee = 0.0 if subtotal >= 10000 else 1500.0

        commission = round(subtotal * settings.PLATFORM_COMMISSION_RATE, 2)
        total = subtotal + delivery_fee
        net_partner = round(subtotal - commission, 2)

        order = Order(
            order_code=_generate_order_code(),
            patient_id=patient.id,
            prescription_id=data.prescription_id,
            pharmacy_id=data.pharmacy_id,
            partner_company_id=data.partner_company_id,
            selected_recommendation_id=data.selected_recommendation_id,
            order_status=OrderStatus.PENDING,
            payment_status=PaymentStatus.UNPAID,
            delivery_method=data.delivery_method,
            delivery_address=data.delivery_address,
            delivery_latitude=data.delivery_latitude,
            delivery_longitude=data.delivery_longitude,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            platform_commission=commission,
            total_amount=total,
            net_partner_amount=net_partner,
        )
        self.db.add(order)
        await self.db.flush()

        for item_data in data.items:
            item = OrderItem(
                order_id=order.id,
                product_listing_id=item_data.product_listing_id,
                product_id=item_data.product_id,
                product_name=item_data.product_name,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=item_data.unit_price * item_data.quantity,
            )
            self.db.add(item)

        await self.db.flush()

        # Create delivery if needed
        if data.delivery_method == DeliveryMethod.DELIVERY:
            delivery = Delivery(
                order_id=order.id,
                destination_address=data.delivery_address,
                destination_latitude=data.delivery_latitude,
                destination_longitude=data.delivery_longitude,
                delivery_fee=delivery_fee,
            )
            self.db.add(delivery)

        await self.db.flush()

        # Notify pharmacy / partner
        notif = NotificationService(self.db)
        if data.pharmacy_id:
            pharmacy_result = await self.db.execute(
                select(Pharmacy).where(Pharmacy.id == data.pharmacy_id)
            )
            pharmacy = pharmacy_result.scalar_one_or_none()
            if pharmacy:
                await notif.order_placed(pharmacy.owner_user_id, order.order_code)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.created",
            entity_type="Order",
            entity_id=order.id,
            new_value={"order_code": order.order_code, "total": float(order.total_amount)},
        )

        # Re-fetch with items loaded to avoid async lazy-load errors
        result = await self.db.execute(
            select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        )
        return result.scalar_one()

    async def update_status(
        self, order_id: str, data: OrderStatusUpdate, actor: User
    ) -> Order:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        old_status = order.order_status
        order.order_status = data.order_status

        # Complete flow: revenue creation
        if data.order_status == OrderStatus.COMPLETED:
            await self._create_revenue(order)

        await self.db.flush()

        # Notify patient
        notif = NotificationService(self.db)
        patient_result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.id == order.patient_id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient:
            await notif.order_status_changed(patient.user_id, order.order_code, data.order_status)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.status_changed",
            entity_type="Order",
            entity_id=order.id,
            old_value={"status": old_status},
            new_value={"status": data.order_status},
        )

        result = await self.db.execute(
            select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        )
        return result.scalar_one()

    async def update_payment_status(
        self, order_id: str, data: PaymentStatusUpdate, actor: User
    ) -> Order:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        order.payment_status = data.payment_status
        if data.payment_reference:
            order.payment_reference = data.payment_reference

        await self.db.flush()
        result = await self.db.execute(
            select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        )
        return result.scalar_one()

    async def _create_revenue(self, order: Order) -> None:
        """Create a revenue record when order is completed."""
        # Check if one already exists
        existing = await self.db.execute(
            select(RevenueRecord).where(RevenueRecord.order_id == order.id)
        )
        if existing.scalar_one_or_none():
            return

        partner_type = "pharmacy" if order.pharmacy_id else "partner_company"
        revenue = RevenueRecord(
            order_id=order.id,
            partner_type=partner_type,
            pharmacy_id=order.pharmacy_id,
            partner_company_id=order.partner_company_id,
            gross_amount=order.subtotal,
            platform_commission=order.platform_commission,
            net_amount=order.net_partner_amount,
            status=RevenueStatus.AVAILABLE,
        )
        self.db.add(revenue)
        await self.db.flush()
