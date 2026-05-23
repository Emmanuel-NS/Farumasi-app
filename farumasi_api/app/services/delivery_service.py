from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import DeliveryStatus, OrderStatus, RiderAvailability
from app.core.exceptions import NotFoundError, BusinessRuleError
from app.models.delivery import Delivery
from app.models.order import Order
from app.models.rider import RiderProfile
from app.models.patient import PatientProfile
from app.repositories.order_repository import DeliveryRepository
from app.schemas.delivery import DeliveryAssignRequest, DeliveryStatusUpdate, QRConfirmRequest
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.utils.qr import generate_qr_token, build_qr_image_base64, build_delivery_qr_payload
from app.models.user import User


class DeliveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DeliveryRepository(db)

    async def assign_delivery(self, data: DeliveryAssignRequest, actor: User) -> Delivery:
        # Find or create delivery
        delivery_result = await self.db.execute(
            select(Delivery).where(Delivery.order_id == data.order_id)
        )
        delivery = delivery_result.scalar_one_or_none()

        if not delivery:
            raise NotFoundError("Delivery for order", data.order_id)

        rider_id = data.rider_id
        if not rider_id:
            # Auto-assign: find available rider
            rider_result = await self.db.execute(
                select(RiderProfile).where(
                    RiderProfile.availability_status == RiderAvailability.ONLINE
                ).limit(1)
            )
            rider = rider_result.scalar_one_or_none()
            if rider:
                rider_id = rider.id

        delivery.rider_id = rider_id
        delivery.delivery_fee = data.delivery_fee
        delivery.rider_earning = data.rider_earning
        delivery.status = DeliveryStatus.ASSIGNED

        # Generate QR
        token = generate_qr_token()
        payload = build_delivery_qr_payload(delivery.id, data.order_id, token)
        delivery.qr_token = token
        delivery.qr_code = build_qr_image_base64(payload)

        await self.db.flush()

        # Notify rider
        if rider_id:
            rider_result = await self.db.execute(
                select(RiderProfile).where(RiderProfile.id == rider_id)
            )
            rider = rider_result.scalar_one_or_none()
            if rider:
                notif = NotificationService(self.db)
                order_result = await self.db.execute(
                    select(Order).where(Order.id == data.order_id)
                )
                order = order_result.scalar_one_or_none()
                if order:
                    await notif.delivery_assigned(rider.user_id, order.order_code)

        return delivery

    async def update_status(
        self, delivery_id: str, data: DeliveryStatusUpdate, actor: User
    ) -> Delivery:
        delivery = await self.repo.get_by_id(delivery_id)
        if not delivery:
            raise NotFoundError("Delivery", delivery_id)

        now = datetime.now(timezone.utc)
        old_status = delivery.status
        delivery.status = data.status

        # Timeline tracking
        if data.status == DeliveryStatus.ACCEPTED:
            delivery.accepted_at = now
        elif data.status == DeliveryStatus.ARRIVED_AT_PICKUP:
            delivery.pickup_arrived_at = now
        elif data.status == DeliveryStatus.PICKED_UP:
            delivery.picked_up_at = now
        elif data.status == DeliveryStatus.OUT_FOR_DELIVERY:
            delivery.delivery_started_at = now
        elif data.status == DeliveryStatus.ARRIVED_AT_DESTINATION:
            delivery.destination_arrived_at = now

        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.status_changed",
            entity_type="Delivery",
            entity_id=delivery.id,
            old_value={"status": old_status},
            new_value={"status": data.status},
        )
        return delivery

    async def confirm_qr(self, delivery_id: str, data: QRConfirmRequest, actor: User) -> Delivery:
        delivery = await self.repo.get_by_id(delivery_id)
        if not delivery:
            raise NotFoundError("Delivery", delivery_id)

        if delivery.status == DeliveryStatus.DELIVERED:
            raise BusinessRuleError("Delivery already confirmed")

        if delivery.qr_token != data.qr_token:
            raise BusinessRuleError("Invalid QR token")

        now = datetime.now(timezone.utc)
        delivery.status = DeliveryStatus.DELIVERED
        delivery.delivered_at = now
        delivery.qr_confirmed_at = now

        if delivery.accepted_at:
            delivery.elapsed_seconds = int((now - delivery.accepted_at).total_seconds())

        await self.db.flush()

        # Update order to completed
        order_result = await self.db.execute(
            select(Order).where(Order.id == delivery.order_id)
        )
        order = order_result.scalar_one_or_none()
        if order:
            order.order_status = OrderStatus.COMPLETED

            # Create revenue
            from app.services.order_service import OrderService
            await OrderService(self.db)._create_revenue(order)

            # Notify patient
            patient_result = await self.db.execute(
                select(PatientProfile).where(PatientProfile.id == order.patient_id)
            )
            patient = patient_result.scalar_one_or_none()
            if patient:
                notif = NotificationService(self.db)
                await notif.delivery_completed(patient.user_id, order.order_code)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.qr_confirmed",
            entity_type="Delivery",
            entity_id=delivery.id,
        )

        return delivery
