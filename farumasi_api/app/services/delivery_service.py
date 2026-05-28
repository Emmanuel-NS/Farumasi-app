from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize a datetime to UTC-aware (SQLite reads back naive)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    DeliveryMethod,
    DeliveryStatus,
    OrderStatus,
    RiderAvailability,
    RiderType,
    UserRole,
)
from app.core.exceptions import (
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from app.models.delivery import Delivery
from app.models.order import Order
from app.models.partner import PartnerCompany
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.models.rider import RiderProfile
from app.models.user import User
from app.repositories.order_repository import DeliveryRepository
from app.schemas.delivery import (
    DeliveryAssignRequest,
    DeliveryCreateRequest,
    DeliveryRejectRequest,
    DeliveryStatusUpdate,
    QRConfirmRequest,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.utils.qr import (
    build_delivery_qr_payload,
    build_qr_image_base64,
    generate_qr_token,
)


# ── State transition table ────────────────────────────────────────────────
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    DeliveryStatus.PENDING_ASSIGNMENT: {
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.ASSIGNED: {
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.REJECTED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.ACCEPTED: {
        DeliveryStatus.GOING_TO_PICKUP,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.FAILED,
    },
    DeliveryStatus.GOING_TO_PICKUP: {
        DeliveryStatus.ARRIVED_AT_PICKUP,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.ARRIVED_AT_PICKUP: {
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    },
    DeliveryStatus.PICKED_UP: {
        DeliveryStatus.OUT_FOR_DELIVERY,
        DeliveryStatus.FAILED,
    },
    DeliveryStatus.OUT_FOR_DELIVERY: {
        DeliveryStatus.ARRIVED_AT_DESTINATION,
        DeliveryStatus.FAILED,
    },
    DeliveryStatus.ARRIVED_AT_DESTINATION: {
        DeliveryStatus.QR_PENDING,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
    },
    DeliveryStatus.QR_PENDING: {
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
    },
    DeliveryStatus.DELIVERED: set(),
    DeliveryStatus.REJECTED: set(),
    DeliveryStatus.CANCELLED: set(),
    DeliveryStatus.FAILED: set(),
}


def _validate_transition(old: str, new: str) -> None:
    if old == new:
        return
    allowed = _ALLOWED_TRANSITIONS.get(old, set())
    if new not in allowed:
        raise BusinessRuleError(
            f"Invalid delivery status transition: {old} -> {new}"
        )


_ADMIN_ROLES = {UserRole.SUPER_ADMIN, UserRole.OPERATIONS_ADMIN}
_OWNER_ROLES = _ADMIN_ROLES | {
    UserRole.PHARMACY_ADMIN,
    UserRole.PHARMACIST,
    UserRole.PARTNER_COMPANY_ADMIN,
}


class DeliveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DeliveryRepository(db)

    # ── Helpers ────────────────────────────────────────────────────────────
    async def _get_order(self, order_id: str) -> Order:
        res = await self.db.execute(select(Order).where(Order.id == order_id))
        order = res.scalar_one_or_none()
        if not order:
            raise NotFoundError("Order", order_id)
        return order

    async def _get_delivery(self, delivery_id: str) -> Delivery:
        res = await self.db.execute(
            select(Delivery).where(Delivery.id == delivery_id)
        )
        delivery = res.scalar_one_or_none()
        if not delivery:
            raise NotFoundError("Delivery", delivery_id)
        return delivery

    async def _get_rider_for_user(self, user_id: str) -> RiderProfile:
        res = await self.db.execute(
            select(RiderProfile).where(RiderProfile.user_id == user_id)
        )
        rider = res.scalar_one_or_none()
        if not rider:
            raise NotFoundError("Rider profile")
        return rider

    async def _user_owns_order(self, actor: User, order: Order) -> bool:
        if actor.role in _ADMIN_ROLES:
            return True
        if actor.role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST) and order.pharmacy_id:
            from app.services.pharmacy_access import user_owns_pharmacy

            return await user_owns_pharmacy(self.db, actor, order.pharmacy_id)
        if actor.role == UserRole.PARTNER_COMPANY_ADMIN and order.partner_company_id:
            res = await self.db.execute(
                select(PartnerCompany.id).where(
                    PartnerCompany.id == order.partner_company_id,
                    PartnerCompany.owner_user_id == actor.id,
                )
            )
            return res.scalar_one_or_none() is not None
        return False

    async def _ensure_delivery_qr(self, delivery: Delivery) -> None:
        if not delivery.qr_token:
            token = generate_qr_token()
            payload = build_delivery_qr_payload(
                delivery.id, delivery.order_id, token
            )
            delivery.qr_token = token
            delivery.qr_code = build_qr_image_base64(payload)

    # ── Create ─────────────────────────────────────────────────────────────
    async def create_delivery(
        self, data: DeliveryCreateRequest, actor: User
    ) -> Delivery:
        if actor.role not in _OWNER_ROLES:
            raise AuthorizationError("Not allowed to create deliveries")

        order = await self._get_order(data.order_id)
        if not await self._user_owns_order(actor, order):
            raise AuthorizationError(
                "Not allowed to create delivery for this order"
            )

        if order.delivery_method != DeliveryMethod.DELIVERY:
            raise BusinessRuleError(
                "Cannot create delivery for a pickup-only order"
            )
        if order.order_status in {
            OrderStatus.REJECTED,
            OrderStatus.CANCELLED,
        }:
            raise BusinessRuleError(
                "Cannot create delivery for a rejected or cancelled order"
            )

        existing = await self.db.execute(
            select(Delivery).where(Delivery.order_id == order.id)
        )
        delivery = existing.scalar_one_or_none()

        if delivery is None:
            delivery = Delivery(
                order_id=order.id,
                status=DeliveryStatus.PENDING_ASSIGNMENT,
            )
            self.db.add(delivery)

        delivery.pickup_address = (
            data.pickup_address or delivery.pickup_address
        )
        if data.pickup_latitude is not None:
            delivery.pickup_latitude = data.pickup_latitude
        if data.pickup_longitude is not None:
            delivery.pickup_longitude = data.pickup_longitude

        delivery.destination_address = (
            data.destination_address
            or delivery.destination_address
            or order.delivery_address
        )
        if data.destination_latitude is not None:
            delivery.destination_latitude = data.destination_latitude
        elif delivery.destination_latitude is None:
            delivery.destination_latitude = order.delivery_latitude
        if data.destination_longitude is not None:
            delivery.destination_longitude = data.destination_longitude
        elif delivery.destination_longitude is None:
            delivery.destination_longitude = order.delivery_longitude

        if data.delivery_fee is not None:
            delivery.delivery_fee = data.delivery_fee
        elif not delivery.delivery_fee:
            delivery.delivery_fee = float(order.delivery_fee or 0)

        await self._ensure_delivery_qr(delivery)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.created",
            entity_type="Delivery",
            entity_id=delivery.id,
            new_value={"order_id": order.id},
        )
        return delivery

    # ── Listing ────────────────────────────────────────────────────────────
    async def list_all(self, actor: User) -> List[Delivery]:
        if actor.role in _ADMIN_ROLES:
            res = await self.db.execute(
                select(Delivery).order_by(Delivery.created_at.desc())
            )
            return list(res.scalars().all())

        if actor.role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
            from app.services.pharmacy_access import resolve_user_pharmacy

            pharmacy = await resolve_user_pharmacy(self.db, actor)
            if not pharmacy:
                return []
            res = await self.db.execute(
                select(Delivery)
                .join(Order, Order.id == Delivery.order_id)
                .where(Order.pharmacy_id == pharmacy.id)
                .order_by(Delivery.created_at.desc())
            )
            return list(res.scalars().all())

        if actor.role == UserRole.PARTNER_COMPANY_ADMIN:
            res = await self.db.execute(
                select(Delivery)
                .join(Order, Order.id == Delivery.order_id)
                .join(
                    PartnerCompany,
                    PartnerCompany.id == Order.partner_company_id,
                )
                .where(PartnerCompany.owner_user_id == actor.id)
                .order_by(Delivery.created_at.desc())
            )
            return list(res.scalars().all())

        if actor.role == UserRole.RIDER:
            rider = await self._get_rider_for_user(actor.id)
            return await self.list_for_rider(rider.id)

        raise AuthorizationError("Not allowed to list deliveries")

    async def get_delivery_scoped(
        self, delivery_id: str, actor: User
    ) -> Delivery:
        delivery = await self._get_delivery(delivery_id)

        if actor.role in _ADMIN_ROLES:
            return delivery

        if actor.role == UserRole.RIDER:
            rider = await self._get_rider_for_user(actor.id)
            if delivery.rider_id != rider.id:
                raise AuthorizationError("Not your delivery")
            return delivery

        if actor.role == UserRole.PATIENT:
            order = await self._get_order(delivery.order_id)
            patient_res = await self.db.execute(
                select(PatientProfile).where(
                    PatientProfile.id == order.patient_id
                )
            )
            patient = patient_res.scalar_one_or_none()
            if not patient or patient.user_id != actor.id:
                raise AuthorizationError("Not your delivery")
            return delivery

        order = await self._get_order(delivery.order_id)
        if not await self._user_owns_order(actor, order):
            raise AuthorizationError("Not allowed to view this delivery")
        return delivery

    async def get_by_order(self, order_id: str, actor: User) -> Optional[Delivery]:
        """Return the delivery row attached to an order, scoped by actor role.

        Patient must own the order; pharmacy staff must own the pharmacy;
        partner admin must own the partner company; rider must be assigned.
        Returns ``None`` if the order has no delivery row yet (e.g. pickup
        order, or delivery not yet created).
        """
        order = await self._get_order(order_id)

        # Authorisation: reuse the same ownership rules as the scoped getter.
        if actor.role in _ADMIN_ROLES:
            pass
        elif actor.role == UserRole.PATIENT:
            patient_res = await self.db.execute(
                select(PatientProfile).where(
                    PatientProfile.id == order.patient_id
                )
            )
            patient = patient_res.scalar_one_or_none()
            if not patient or patient.user_id != actor.id:
                raise AuthorizationError("Not your order")
        elif actor.role == UserRole.RIDER:
            rider = await self._get_rider_for_user(actor.id)
            # Rider must be currently assigned to this order's delivery.
            res = await self.db.execute(
                select(Delivery).where(
                    Delivery.order_id == order_id,
                    Delivery.rider_id == rider.id,
                )
            )
            return res.scalar_one_or_none()
        else:
            if not await self._user_owns_order(actor, order):
                raise AuthorizationError("Not allowed to view this delivery")

        res = await self.db.execute(
            select(Delivery).where(Delivery.order_id == order_id)
        )
        return res.scalar_one_or_none()

    # ── Assignment ─────────────────────────────────────────────────────────
    async def assign_delivery_by_id(
        self,
        delivery_id: str,
        data: DeliveryAssignRequest,
        actor: User,
    ) -> Delivery:
        delivery = await self._get_delivery(delivery_id)
        order = await self._get_order(delivery.order_id)

        if not await self._user_owns_order(actor, order):
            raise AuthorizationError("Not allowed to assign this delivery")

        if delivery.status not in {
            DeliveryStatus.PENDING_ASSIGNMENT,
            DeliveryStatus.REJECTED,
        }:
            raise BusinessRuleError(
                f"Delivery cannot be (re)assigned from status {delivery.status}"
            )

        rider_id = data.rider_id
        if not rider_id:
            res = await self.db.execute(
                select(RiderProfile)
                .where(
                    RiderProfile.availability_status
                    == RiderAvailability.ONLINE
                )
                .limit(1)
            )
            auto = res.scalar_one_or_none()
            if auto:
                rider_id = auto.id

        if not rider_id:
            raise BusinessRuleError("No rider available to assign")

        rider_res = await self.db.execute(
            select(RiderProfile).where(RiderProfile.id == rider_id)
        )
        rider = rider_res.scalar_one_or_none()
        if not rider:
            raise NotFoundError("Rider", rider_id)

        delivery.rider_id = rider.id
        if data.delivery_fee is not None:
            delivery.delivery_fee = data.delivery_fee
        if data.rider_earning is not None:
            delivery.rider_earning = data.rider_earning
        delivery.status = DeliveryStatus.ASSIGNED
        delivery.rejection_reason = None

        await self._ensure_delivery_qr(delivery)
        await self.db.flush()

        await NotificationService(self.db).delivery_assigned(
            rider.user_id, order.order_code
        )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.assigned",
            entity_type="Delivery",
            entity_id=delivery.id,
            new_value={"rider_id": rider.id},
        )
        return delivery

    async def assign_delivery_legacy(
        self, data: DeliveryAssignRequest, actor: User
    ) -> Delivery:
        """Back-compat: POST /deliveries/assign with order_id in body."""
        if not data.order_id:
            raise ValidationError(
                "order_id is required for the legacy assign route"
            )

        res = await self.db.execute(
            select(Delivery).where(Delivery.order_id == data.order_id)
        )
        delivery = res.scalar_one_or_none()
        if not delivery:
            raise NotFoundError("Delivery for order", data.order_id)

        return await self.assign_delivery_by_id(delivery.id, data, actor)

    # ── Rider accept / reject ──────────────────────────────────────────────
    async def accept_for_rider(self, delivery_id: str, actor: User) -> Delivery:
        rider = await self._get_rider_for_user(actor.id)
        delivery = await self._get_delivery(delivery_id)
        if delivery.rider_id != rider.id:
            raise AuthorizationError("Not your delivery")

        _validate_transition(delivery.status, DeliveryStatus.ACCEPTED)
        delivery.status = DeliveryStatus.ACCEPTED
        delivery.accepted_at = datetime.now(timezone.utc)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.accepted",
            entity_type="Delivery",
            entity_id=delivery.id,
        )
        return delivery

    async def reject_for_rider(
        self, delivery_id: str, data: DeliveryRejectRequest, actor: User
    ) -> Delivery:
        rider = await self._get_rider_for_user(actor.id)
        delivery = await self._get_delivery(delivery_id)
        if delivery.rider_id != rider.id:
            raise AuthorizationError("Not your delivery")

        _validate_transition(delivery.status, DeliveryStatus.REJECTED)
        delivery.status = DeliveryStatus.REJECTED
        delivery.rejection_reason = (
            data.custom_reason.strip()
            if data.custom_reason and data.custom_reason.strip()
            else data.reason.value
        )
        delivery.rider_id = None
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.rejected",
            entity_type="Delivery",
            entity_id=delivery.id,
            new_value={"reason": data.reason.value},
        )
        return delivery

    # ── Status updates ─────────────────────────────────────────────────────
    async def update_status_scoped(
        self,
        delivery_id: str,
        data: DeliveryStatusUpdate,
        actor: User,
    ) -> Delivery:
        delivery = await self._get_delivery(delivery_id)

        if actor.role == UserRole.RIDER:
            rider = await self._get_rider_for_user(actor.id)
            if delivery.rider_id != rider.id:
                raise AuthorizationError("Not your delivery")
        elif actor.role not in _ADMIN_ROLES:
            order = await self._get_order(delivery.order_id)
            if not await self._user_owns_order(actor, order):
                raise AuthorizationError(
                    "Not allowed to update this delivery"
                )

        new_status = (
            data.status.value
            if hasattr(data.status, "value")
            else str(data.status)
        )
        _validate_transition(delivery.status, new_status)

        now = datetime.now(timezone.utc)
        old_status = delivery.status
        delivery.status = new_status

        if new_status == DeliveryStatus.ACCEPTED and not delivery.accepted_at:
            delivery.accepted_at = now
        elif new_status == DeliveryStatus.ARRIVED_AT_PICKUP:
            delivery.pickup_arrived_at = now
        elif new_status == DeliveryStatus.PICKED_UP:
            delivery.picked_up_at = now
        elif new_status == DeliveryStatus.OUT_FOR_DELIVERY:
            delivery.delivery_started_at = now
        elif new_status == DeliveryStatus.ARRIVED_AT_DESTINATION:
            delivery.destination_arrived_at = now

        if new_status in {
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
        }:
            order = await self._get_order(delivery.order_id)
            if order.order_status not in {
                OrderStatus.OUT_FOR_DELIVERY,
                OrderStatus.DELIVERED,
                OrderStatus.COMPLETED,
                OrderStatus.CANCELLED,
                OrderStatus.REJECTED,
            }:
                order.order_status = OrderStatus.OUT_FOR_DELIVERY

        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.status_changed",
            entity_type="Delivery",
            entity_id=delivery.id,
            old_value={"status": old_status},
            new_value={"status": new_status},
        )
        return delivery

    # ── Rider-scoped listing ───────────────────────────────────────────────
    async def list_for_rider(self, rider_id: str) -> List[Delivery]:
        res = await self.db.execute(
            select(Delivery)
            .where(Delivery.rider_id == rider_id)
            .order_by(Delivery.created_at.desc())
        )
        return list(res.scalars().all())

    async def get_active_for_rider(self, rider_id: str) -> List[Delivery]:
        active_statuses = {
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.GOING_TO_PICKUP,
            DeliveryStatus.ARRIVED_AT_PICKUP,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
            DeliveryStatus.ARRIVED_AT_DESTINATION,
            DeliveryStatus.QR_PENDING,
        }
        res = await self.db.execute(
            select(Delivery)
            .where(
                Delivery.rider_id == rider_id,
                Delivery.status.in_(active_statuses),
            )
            .order_by(Delivery.created_at.desc())
        )
        return list(res.scalars().all())

    # ── QR confirmation ────────────────────────────────────────────────────
    async def confirm_qr_scoped(
        self,
        delivery_id: str,
        data: QRConfirmRequest,
        actor: User,
    ) -> Delivery:
        delivery = await self._get_delivery(delivery_id)

        if actor.role == UserRole.RIDER:
            rider = await self._get_rider_for_user(actor.id)
            if delivery.rider_id != rider.id:
                raise AuthorizationError("Not your delivery")
        elif actor.role not in _ADMIN_ROLES:
            raise AuthorizationError(
                "Only the assigned rider can confirm delivery"
            )

        if delivery.status == DeliveryStatus.DELIVERED:
            raise BusinessRuleError("Delivery already confirmed")

        confirmable_states = {
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.GOING_TO_PICKUP,
            DeliveryStatus.ARRIVED_AT_PICKUP,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
            DeliveryStatus.ARRIVED_AT_DESTINATION,
            DeliveryStatus.QR_PENDING,
        }
        if delivery.status not in confirmable_states:
            raise BusinessRuleError(
                f"Delivery cannot be confirmed from status {delivery.status}"
            )

        if not delivery.qr_token or delivery.qr_token != data.qr_token:
            raise BusinessRuleError("Invalid QR token")

        now = datetime.now(timezone.utc)
        delivery.status = DeliveryStatus.DELIVERED
        delivery.delivered_at = now
        delivery.qr_confirmed_at = now
        accepted_at_utc = _as_utc(delivery.accepted_at)
        if accepted_at_utc:
            delivery.elapsed_seconds = int(
                (now - accepted_at_utc).total_seconds()
            )

        await self.db.flush()

        order = await self._get_order(delivery.order_id)
        order.order_status = OrderStatus.COMPLETED

        # _create_revenue is idempotent — guards against duplicates.
        from app.services.order_service import OrderService  # avoid cycle

        await OrderService(self.db)._create_revenue(order)

        patient_res = await self.db.execute(
            select(PatientProfile).where(
                PatientProfile.id == order.patient_id
            )
        )
        patient = patient_res.scalar_one_or_none()
        if patient:
            await NotificationService(self.db).delivery_completed(
                patient.user_id, order.order_code
            )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="delivery.qr_confirmed",
            entity_type="Delivery",
            entity_id=delivery.id,
        )
        return delivery

    # ── Timer ──────────────────────────────────────────────────────────────
    async def get_timer(self, delivery_id: str, actor: User) -> dict:
        delivery = await self.get_delivery_scoped(delivery_id, actor)
        current_elapsed: Optional[int] = None
        accepted_at_utc = _as_utc(delivery.accepted_at)
        if accepted_at_utc and not delivery.delivered_at:
            current_elapsed = int(
                (
                    datetime.now(timezone.utc) - accepted_at_utc
                ).total_seconds()
            )
        elif delivery.elapsed_seconds is not None:
            current_elapsed = delivery.elapsed_seconds
        return {
            "delivery_id": delivery.id,
            "status": delivery.status,
            "accepted_at": delivery.accepted_at,
            "delivered_at": delivery.delivered_at,
            "elapsed_seconds": delivery.elapsed_seconds,
            "current_elapsed_seconds": current_elapsed,
        }

    # ── Patient QR ────────────────────────────────────────────────────────
    async def get_qr_for_patient(self, order_id: str, actor: User) -> dict:
        order = await self._get_order(order_id)
        patient_res = await self.db.execute(
            select(PatientProfile).where(
                PatientProfile.id == order.patient_id
            )
        )
        patient = patient_res.scalar_one_or_none()
        if not patient or patient.user_id != actor.id:
            raise AuthorizationError("Not your order")

        if order.delivery_method != DeliveryMethod.DELIVERY:
            raise BusinessRuleError("Order has no delivery component")

        res = await self.db.execute(
            select(Delivery).where(Delivery.order_id == order.id)
        )
        delivery = res.scalar_one_or_none()
        if not delivery:
            raise NotFoundError("Delivery for order", order_id)

        if not delivery.qr_token:
            await self._ensure_delivery_qr(delivery)
            await self.db.flush()

        return {
            "delivery_id": delivery.id,
            "order_id": order.id,
            "status": delivery.status,
            "qr_token": delivery.qr_token,
            "qr_code": delivery.qr_code,
        }

    # ── Earnings placeholder ──────────────────────────────────────────────
    async def compute_rider_earnings(self, rider: RiderProfile) -> dict:
        now = datetime.now(timezone.utc)
        start_today = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        start_week = start_today - timedelta(days=now.weekday())
        start_month = start_today.replace(day=1)

        async def _stats(since: datetime) -> Tuple[int, float]:
            res = await self.db.execute(
                select(
                    func.count(Delivery.id),
                    func.coalesce(func.sum(Delivery.rider_earning), 0),
                ).where(
                    Delivery.rider_id == rider.id,
                    Delivery.status == DeliveryStatus.DELIVERED,
                    Delivery.delivered_at >= since,
                )
            )
            row = res.one()
            return int(row[0] or 0), float(row[1] or 0)

        cnt_today, earn_today = await _stats(start_today)
        cnt_week, earn_week = await _stats(start_week)
        cnt_month, earn_month = await _stats(start_month)

        if rider.rider_type == RiderType.PER_TRIP:
            return {
                "rider_type": rider.rider_type,
                "completed_deliveries_today": cnt_today,
                "completed_deliveries_week": cnt_week,
                "completed_deliveries_month": cnt_month,
                "estimated_earnings_today": earn_today,
                "estimated_earnings_week": earn_week,
                "estimated_earnings_month": earn_month,
                "pending_payout": earn_week,
            }

        return {
            "rider_type": rider.rider_type,
            "completed_deliveries_today": cnt_today,
            "completed_deliveries_week": cnt_week,
            "completed_deliveries_month": cnt_month,
            "estimated_earnings_today": 0.0,
            "estimated_earnings_week": 0.0,
            "estimated_earnings_month": 0.0,
            "pending_payout": 0.0,
        }

    # ── Legacy aliases ─────────────────────────────────────────────────────
    async def assign_delivery(
        self, data: DeliveryAssignRequest, actor: User
    ) -> Delivery:
        return await self.assign_delivery_legacy(data, actor)

    async def update_status(
        self, delivery_id: str, data: DeliveryStatusUpdate, actor: User
    ) -> Delivery:
        return await self.update_status_scoped(delivery_id, data, actor)

    async def confirm_qr(
        self, delivery_id: str, data: QRConfirmRequest, actor: User
    ) -> Delivery:
        return await self.confirm_qr_scoped(delivery_id, data, actor)
