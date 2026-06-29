from __future__ import annotations

import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import select, func, update as sa_update, case, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.constants import (
    DeliveryMethod,
    DeliveryStatus,
    EntityStatus,
    ListingAvailability,
    OrderStatus,
    PaymentStatus,
    PrescriptionStatus,
    ProductApprovalStatus,
    RevenueStatus,
    SellMode,
    UserRole,
    normalize_order_status,
    order_bucket_statuses,
    PARTNER_RESPONSE_TIMEOUT_MINUTES,
)
from app.core.exceptions import (
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.order_partner_assignment import OrderPartnerAssignment
from app.models.partner import PartnerCompany
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.models.rider import RiderProfile
from app.models.prescription import DigitalPrescription, PrescriptionItem
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.recommendation import PharmacyRecommendation
from app.models.revenue import RevenueRecord
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.schemas.order import (
    ConfirmDispatchRequest,
    ConfirmRiderHandoverRequest,
    OrderCreate,
    OrderItemCreate,
    OrderStatusUpdate,
    PaymentStatusUpdate,
    ReassignPharmacyRequest,
    ReassignmentOptionOut,
    ReassignmentOptionsOut,
    SetRiderAccessCodeRequest,
    VerifyAccessCodeRequest,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.utils.packaging import resolve_order_line
from app.utils.distance import road_distance_km, is_outside_kigali
from app.services.platform_settings_service import (
    PlatformSettingsService,
    calculate_delivery_fee_from_config,
)


_OWNER_MANAGE_STATUSES = {
    OrderStatus.PENDING,
    OrderStatus.ACCEPTED,
    OrderStatus.REJECTED,
    OrderStatus.PREPARING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
}

_PARTNER_RESPONSE_MINUTES = PARTNER_RESPONSE_TIMEOUT_MINUTES
_REASSIGN_PRICE_TOLERANCE = 1.0


def _generate_order_code() -> str:
    return f"FAR-{uuid.uuid4().hex[:8].upper()}"


def _generate_patient_access_code() -> str:
    """Auto-generated pickup/delivery verification code (shown to patient after checkout)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _suggested_dispatch_from_rx_item(rx_item: PrescriptionItem) -> tuple[Optional[str], Optional[str]]:
    """Pharmacist cart dosage/instructions copied to order items for partner pre-fill."""
    parts = [
        (rx_item.dosage or "").strip(),
        (rx_item.frequency or "").strip(),
        (rx_item.duration or "").strip(),
    ]
    dosage = " · ".join(p for p in parts if p) or None
    notes = (rx_item.instructions or "").strip() or None
    return dosage, notes


class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrderRepository(db)

    # ── Public API ────────────────────────────────────────────────────────

    async def create_order(self, data: OrderCreate, actor: User) -> Order:
        patient = await self._get_patient_for_user(actor)
        if not patient:
            raise NotFoundError("Patient profile")

        if data.selected_recommendation_id:
            items, pharmacy_id, partner_id = await self._items_from_recommendation(
                data, patient.id
            )
        else:
            items, pharmacy_id, partner_id = await self._items_from_request_items(
                data, patient_id=patient.id
            )

        if not items:
            raise ValidationError("Order must have at least one item")

        # Enforce prescription_required: if any chosen item's product needs a
        # prescription, the order must reference an approved (reviewed)
        # prescription belonging to the same patient.
        await self._assert_prescription_for_items(items, data.prescription_id, patient.id)

        subtotal = sum(it["unit_price"] * it["quantity"] for it in items)
        delivery_fee = 0.0
        _delivery_distance_km: Optional[float] = None
        if data.delivery_method == DeliveryMethod.DELIVERY:
            if data.delivery_latitude is None or data.delivery_longitude is None:
                raise ValidationError(
                    "Location access is required for delivery orders. "
                    "Enable GPS in your browser or app and try again."
                )
            # Calculate distance-based fee using real road distance (returns fee, distance)
            delivery_fee, _delivery_distance_km = await self._calculate_order_delivery_fee(
                data, pharmacy_id, partner_id
            )

        commission_rate = await self._resolve_commission_rate(pharmacy_id, partner_id)
        commission = round(subtotal * commission_rate, 2)
        total = round(subtotal + delivery_fee, 2)
        net_partner = round(subtotal - commission, 2)

        order = Order(
            order_code=_generate_order_code(),
            patient_id=patient.id,
            prescription_id=data.prescription_id,
            pharmacy_id=pharmacy_id,
            partner_company_id=partner_id,
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
            patient_access_code=_generate_patient_access_code(),
            notes=data.notes or None,
            defer_delivery_fee=bool(data.defer_delivery_fee),
            pharmacy_assigned_at=_now(),
        )
        self.db.add(order)
        await self.db.flush()

        for it in items:
            self.db.add(
                OrderItem(
                    order_id=order.id,
                    product_listing_id=it.get("product_listing_id"),
                    product_id=it.get("product_id"),
                    product_name=it["product_name"],
                    quantity=it["quantity"],
                    sell_mode=it.get("sell_mode", "pack"),
                    unit_price=it["unit_price"],
                    total_price=round(it["unit_price"] * it["quantity"], 2),
                    dispatch_dosage=it.get("dispatch_dosage"),
                    dispatch_notes=it.get("dispatch_notes"),
                )
            )
        await self.db.flush()

        # Reserve stock: decrement listing.stock_quantity now so concurrent
        # orders cannot oversell. Released back if the order is later
        # CANCELLED / REJECTED / FAILED (see update_status).
        await self._adjust_stock_for_items(items, sign=-1)

        # Pre-existing behavior (kept untouched in Phase 6): if delivery method,
        # create a Delivery row so downstream phases can attach a rider.
        if data.delivery_method == DeliveryMethod.DELIVERY:
            delivery = Delivery(
                order_id=order.id,
                destination_address=data.delivery_address,
                destination_latitude=data.delivery_latitude,
                destination_longitude=data.delivery_longitude,
                delivery_fee=delivery_fee,
                estimated_distance_km=_delivery_distance_km,
            )
            await self._populate_delivery_pickup(order, delivery)
            self.db.add(delivery)
            await self.db.flush()

        # Notify pharmacy/partner staff. For pharmacies we fan out to every
        # staff member (admin + pharmacists) so the whole team sees new orders.
        notif = NotificationService(self.db)
        recipient_ids: list[str] = []
        if pharmacy_id:
            from app.services.pharmacy_access import list_pharmacy_staff_user_ids

            recipient_ids = await list_pharmacy_staff_user_ids(self.db, pharmacy_id)
        else:
            owner_user_id = await self._owner_user_id(pharmacy_id, partner_id)
            if owner_user_id:
                recipient_ids = [owner_user_id]
        for uid in recipient_ids:
            await notif.order_placed(uid, order.id, order_code=order.order_code)

        patient_user_id = await self._patient_user_id(patient.id)
        if patient_user_id:
            await notif.patient_order_placed(
                patient_user_id, order.id, order_code=order.order_code
            )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.created",
            entity_type="Order",
            entity_id=order.id,
            new_value={"order_code": order.order_code, "total": float(order.total_amount)},
        )

        await self._open_partner_assignment(order)

        # Mark linked prescription as fulfilled
        if data.prescription_id:
            rx_res = await self.db.execute(
                select(DigitalPrescription).where(DigitalPrescription.id == data.prescription_id)
            )
            rx = rx_res.scalar_one_or_none()
            if rx:
                rx.status = PrescriptionStatus.FULFILLED
                await self.db.flush()

        return await self._reload(order.id)

    async def get_order(self, order_id: str, actor: User) -> Order:
        order = await self._reload(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_view(order, actor)
        await self._ensure_partner_response_due_at(order)
        return order

    async def list_patient_orders(
        self, actor: User, *, offset: int, limit: int
    ) -> Tuple[List[Order], int]:
        patient = await self._get_patient_for_user(actor)
        if not patient:
            return [], 0
        return await self._paginate(
            Order.patient_id == patient.id, offset=offset, limit=limit
        )

    async def list_pharmacy_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
    ) -> Tuple[List[Order], int]:
        pharmacy = await self._get_owned_pharmacy(actor)
        # Farumasi internal pharmacists (no pharmacy affiliation) see ALL orders
        # platform-wide, like a read-only super-admin.
        if not pharmacy and actor.role == UserRole.PHARMACIST:
            conds: list = []
            if status:
                conds.append(Order.order_status == status)
            if from_date:
                conds.append(Order.created_at >= from_date)
            return await self._paginate(*conds, offset=offset, limit=limit)
        if not pharmacy:
            raise NotFoundError("Pharmacy")
        conds = [Order.pharmacy_id == pharmacy.id]
        if status:
            conds.append(Order.order_status == status)
        if from_date:
            conds.append(Order.created_at >= from_date)
        return await self._paginate(
            *conds, offset=offset, limit=limit, pending_confirmation_first=True
        )

    async def list_platform_pharmacist_monitor_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
    ) -> Tuple[List[Order], int]:
        """All platform orders for internal Farumasi pharmacists (read-only monitor).

        Unlike ``list_pharmacy_orders``, this ignores pharmacy-staff affiliation so
        the pharmacist portal shows every order awaiting partner confirmation.
        """
        if actor.role not in (UserRole.PHARMACIST, UserRole.SUPER_ADMIN):
            raise AuthorizationError("Not allowed to list platform orders")
        conds: list = []
        if status:
            conds.append(Order.order_status == status)
        if from_date:
            conds.append(Order.created_at >= from_date)
        return await self._paginate(
            *conds, offset=offset, limit=limit, pending_confirmation_first=True
        )

    async def list_partner_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
    ) -> Tuple[List[Order], int]:
        """All orders for pharmacies and partner companies owned by this user."""
        return await self.list_orders_for_owner(
            actor, offset=offset, limit=limit, status=status, from_date=from_date
        )

    async def list_orders_for_owner(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
        from_date: Optional[datetime] = None,
    ) -> Tuple[List[Order], int]:
        from sqlalchemy import or_

        pharmacy_ids = list(
            (
                await self.db.execute(
                    select(Pharmacy.id).where(Pharmacy.owner_user_id == actor.id)
                )
            ).scalars().all()
        )
        partner_ids = list(
            (
                await self.db.execute(
                    select(PartnerCompany.id).where(
                        PartnerCompany.owner_user_id == actor.id
                    )
                )
            ).scalars().all()
        )
        if not pharmacy_ids and not partner_ids:
            return [], 0

        scope: list = []
        if pharmacy_ids:
            scope.append(Order.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            scope.append(Order.partner_company_id.in_(partner_ids))
        conds = [or_(*scope)]
        if status:
            conds.append(Order.order_status == status)
        if from_date:
            conds.append(Order.created_at >= from_date)
        return await self._paginate(
            *conds, offset=offset, limit=limit, pending_confirmation_first=True
        )

    async def list_all_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
        bucket: Optional[str] = None,
    ) -> Tuple[List[Order], int]:
        """Role-scoped list. Used by ``GET /api/v1/orders``."""
        role = actor.role
        platform_roles = {
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.FINANCE_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
        }
        if role in platform_roles:
            conds = []
            if bucket:
                statuses = order_bucket_statuses(bucket)
                if not statuses:
                    raise ValidationError(f"Unknown order bucket '{bucket}'")
                conds.append(Order.order_status.in_(statuses))
            elif status:
                conds.append(Order.order_status == status)
            return await self._paginate(*conds, offset=offset, limit=limit)
        if role == UserRole.PATIENT:
            return await self.list_patient_orders(actor, offset=offset, limit=limit)
        if role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
            return await self.list_pharmacy_orders(
                actor, offset=offset, limit=limit, status=status
            )
        if role == UserRole.PARTNER_COMPANY_ADMIN:
            return await self.list_partner_orders(
                actor, offset=offset, limit=limit, status=status
            )
        raise AuthorizationError("Not allowed to list orders")

    async def update_status(
        self, order_id: str, data: OrderStatusUpdate, actor: User
    ) -> Order:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        await self._assert_can_change_status(order, actor, data.order_status)
        await self._assert_paid_before_fulfilment(order, data.order_status, actor)

        if data.order_status == OrderStatus.READY_FOR_PICKUP:
            raise BusinessRuleError(
                "Use confirm-dispatch with batch numbers, expiry dates, manufacturer, "
                "and the patient access code before marking the order ready."
            )

        old_status = normalize_order_status(order.order_status)
        if order.order_status != old_status:
            order.order_status = old_status
        order.order_status = data.order_status

        if (
            data.order_status == OrderStatus.ACCEPTED
            and order.pharmacy_confirmed_at is None
        ):
            order.pharmacy_confirmed_at = _now()

        # Release reserved stock when the order is cancelled / rejected / failed
        # (only once — guarded by the old_status check).
        _RELEASE_STATUSES = {
            OrderStatus.CANCELLED,
            OrderStatus.REJECTED,
            OrderStatus.FAILED,
        }
        if (
            data.order_status in _RELEASE_STATUSES
            and old_status not in _RELEASE_STATUSES
        ):
            await self._release_stock_for_order(order)
            await self._close_partner_assignment(order, "cancelled")
            if (
                data.order_status == OrderStatus.CANCELLED
                and order.payment_status == PaymentStatus.PAID
            ):
                await self._queue_refund(order, actor)

        if data.order_status in (OrderStatus.COMPLETED, OrderStatus.DELIVERED):
            # Revenue is credited when stock leaves the partner (pickup verify or rider handover).
            if order.partner_fulfilled_at is None:
                await self._create_revenue(order)

        await self.db.flush()

        notif = NotificationService(self.db)
        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await notif.order_status_changed(
                patient_user_id, order.id, data.order_status, order_code=order.order_code
            )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.status_changed",
            entity_type="Order",
            entity_id=order.id,
            old_value={"status": old_status},
            new_value={"status": data.order_status},
        )

        return await self._reload(order.id)

    async def update_payment_status(
        self, order_id: str, data: PaymentStatusUpdate, actor: User
    ) -> Order:
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        await self._assert_can_update_payment(order, actor)

        order.payment_status = data.payment_status
        if data.payment_reference:
            order.payment_reference = data.payment_reference
        if data.payment_status == PaymentStatus.PAID:
            order.amount_paid_snapshot = float(order.total_amount or 0)
            if not order.partner_response_due_at:
                order.partner_response_due_at = _now() + timedelta(
                    minutes=_PARTNER_RESPONSE_MINUTES
                )

        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.payment_changed",
            entity_type="Order",
            entity_id=order.id,
            new_value={"payment_status": data.payment_status},
        )

        return await self._reload(order.id)

    async def set_rider_access_code(
        self, order_id: str, data: SetRiderAccessCodeRequest, actor: User
    ) -> Order:
        """Farumasi internal pharmacist sets a rider access code on a delivery order."""
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_change_status(order, actor, order.order_status)
        if order.delivery_method != "delivery":
            raise BusinessRuleError("Rider access codes are only for delivery orders")
        order.rider_access_code = data.rider_access_code
        await self.db.flush()
        return await self._reload(order.id)

    async def verify_access_code(
        self, order_id: str, data: VerifyAccessCodeRequest, actor: User
    ) -> Order:
        """Verify patient access code at pickup or final delivery to patient."""
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_verify_access_code(order, actor)
        if not order.patient_access_code:
            raise BusinessRuleError("This order has no access code set")
        if order.patient_access_code.lower() != data.access_code.lower():
            raise AuthorizationError("Incorrect access code")

        if order.delivery_method == DeliveryMethod.PICKUP.value:
            if order.order_status != OrderStatus.READY_FOR_PICKUP:
                raise BusinessRuleError("Order must be ready_for_pickup to complete with access code")
            if order.partner_fulfilled_at is not None:
                raise BusinessRuleError("This order was already fulfilled by the partner")
            if await self._requires_physical_prescription(order):
                if not data.physical_prescription_present:
                    raise BusinessRuleError(
                        "Physical prescription must be verified before completing pickup"
                    )
            now = _now()
            order.order_status = OrderStatus.COMPLETED
            order.partner_fulfilled_at = now
            await self.db.flush()
            await self._credit_partner_revenue(order)
            await self._close_partner_assignment(order, "completed")
        else:
            if order.order_status != OrderStatus.OUT_FOR_DELIVERY:
                raise BusinessRuleError("Order must be out_for_delivery to verify delivery access code")
            if order.partner_fulfilled_at is None:
                raise BusinessRuleError(
                    "Partner must hand medicines to the rider before patient delivery verification"
                )
            order.order_status = OrderStatus.DELIVERED
            await self.db.flush()
            if not await self._requires_physical_prescription(order):
                order.order_status = OrderStatus.COMPLETED
                await self.db.flush()

        await self.db.flush()

        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await NotificationService(self.db).order_status_changed(
                patient_user_id,
                order.id,
                order.order_status,
                order_code=order.order_code,
            )

        return await self._reload(order.id)

    async def confirm_rider_handover(
        self, order_id: str, data: ConfirmRiderHandoverRequest, actor: User
    ) -> Order:
        """Partner releases stock to a FARUMASI rider — credits partner wallet."""
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        if order.delivery_method != DeliveryMethod.DELIVERY.value:
            raise BusinessRuleError("Rider handover applies to delivery orders only")
        if order.order_status != OrderStatus.READY_FOR_PICKUP:
            raise BusinessRuleError("Order must be ready_for_pickup before rider handover")
        if order.partner_fulfilled_at is not None:
            raise BusinessRuleError("Partner already fulfilled this order")
        await self._assert_can_change_status(order, actor, OrderStatus.OUT_FOR_DELIVERY)
        await self._assert_paid_before_fulfilment(order, OrderStatus.OUT_FOR_DELIVERY, actor)

        if not order.rider_access_code:
            raise BusinessRuleError(
                "Rider access code is not set yet. FARUMASI must assign a rider first."
            )
        if not order.patient_access_code:
            raise BusinessRuleError("Patient access code is required on this order")
        if order.rider_access_code.lower() != data.rider_access_code.strip().lower():
            raise AuthorizationError("Incorrect rider access code")
        if order.patient_access_code.lower() != data.patient_access_code.strip().lower():
            raise AuthorizationError("Incorrect patient access code")

        now = _now()
        order.partner_fulfilled_at = now
        order.order_status = OrderStatus.OUT_FOR_DELIVERY
        await self.db.flush()

        delivery_res = await self.db.execute(
            select(Delivery).where(Delivery.order_id == order.id)
        )
        delivery = delivery_res.scalar_one_or_none()
        if delivery and delivery.status not in {
            DeliveryStatus.PICKED_UP.value,
            DeliveryStatus.OUT_FOR_DELIVERY.value,
            DeliveryStatus.DELIVERED.value,
        }:
            delivery.status = DeliveryStatus.PICKED_UP.value
            delivery.picked_up_at = now
            await self.db.flush()

        await self._credit_partner_revenue(order)
        await self._close_partner_assignment(order, "handed_to_rider")

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.rider_handover",
            entity_type="Order",
            entity_id=order.id,
        )

        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await NotificationService(self.db).order_status_changed(
                patient_user_id,
                order.id,
                OrderStatus.OUT_FOR_DELIVERY,
                order_code=order.order_code,
            )

        return await self._reload(order.id)

    async def confirm_physical_prescription_collected(
        self, order_id: str, actor: User
    ) -> Order:
        """Farumasi pharmacist confirms physical prescription paper was collected."""
        if actor.role not in (UserRole.PHARMACIST, UserRole.SUPER_ADMIN):
            raise AuthorizationError(
                "Only Farumasi pharmacists can confirm physical prescription collection"
            )
        order = await self.repo.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        if not order.prescription_id:
            raise BusinessRuleError("This order has no prescription")
        if not await self._requires_physical_prescription(order):
            raise BusinessRuleError(
                "This prescription is marked soft/digital — no physical collection required"
            )
        if order.order_status not in (OrderStatus.DELIVERED, OrderStatus.OUT_FOR_DELIVERY):
            raise BusinessRuleError(
                "Order must be delivered to the patient before prescription collection is confirmed"
            )
        if order.physical_prescription_collected_at is not None:
            raise BusinessRuleError("Physical prescription already marked as collected")
        if order.partner_fulfilled_at is None:
            raise BusinessRuleError("Partner has not fulfilled this order yet")

        order.physical_prescription_collected_at = _now()
        order.order_status = OrderStatus.COMPLETED
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.physical_prescription_collected",
            entity_type="Order",
            entity_id=order.id,
        )

        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await NotificationService(self.db).order_status_changed(
                patient_user_id,
                order.id,
                OrderStatus.COMPLETED,
                order_code=order.order_code,
            )

        return await self._reload(order.id)

    async def confirm_dispatch(
        self, order_id: str, data: ConfirmDispatchRequest, actor: User
    ) -> Order:
        """Partner records batch traceability and verifies access code before dispatch."""
        order = await self.repo.get_with_items(order_id)
        if not order:
            raise NotFoundError("Order", order_id)

        await self._assert_can_change_status(order, actor, OrderStatus.READY_FOR_PICKUP)
        await self._assert_paid_before_fulfilment(order, OrderStatus.READY_FOR_PICKUP, actor)

        if order.order_status not in (OrderStatus.PREPARING, OrderStatus.ACCEPTED):
            raise BusinessRuleError(
                "Order must be accepted or preparing before dispatch confirmation"
            )

        item_by_id = {oi.id: oi for oi in order.items}
        if set(item_by_id) != {rec.order_item_id for rec in data.items}:
            raise ValidationError(
                "Dispatch records must be provided for every line item on the order"
            )

        now = _now()
        for rec in data.items:
            oi = item_by_id[rec.order_item_id]
            expiry = rec.expiry_date
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry <= now:
                raise ValidationError(
                    f"Expiry date for '{oi.product_name}' must be in the future"
                )
            oi.dispatch_batch_number = rec.batch_number.strip()
            oi.dispatch_expiry_date = expiry
            oi.dispatch_manufacturer = rec.manufacturer.strip()
            oi.dispatch_country_of_origin = rec.country_of_origin.strip()
            oi.dispatch_dosage = (rec.dosage or "").strip() or None
            oi.dispatch_notes = (rec.notes or "").strip() or None
            oi.dispatch_confirmed_at = now

        order.dispatch_confirmed_at = now
        order.order_status = OrderStatus.READY_FOR_PICKUP
        await self.db.flush()

        patient_user_id = await self._patient_user_id(order.patient_id)
        notif = NotificationService(self.db)
        if patient_user_id:
            await notif.dispatch_confirmed(
                patient_user_id,
                order.id,
                order_code=order.order_code,
            )
            await notif.order_status_changed(
                patient_user_id,
                order.id,
                OrderStatus.READY_FOR_PICKUP,
                order_code=order.order_code,
            )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.dispatch_confirmed",
            entity_type="Order",
            entity_id=order.id,
            new_value={
                "items": [
                    {
                        "order_item_id": rec.order_item_id,
                        "batch_number": rec.batch_number,
                        "expiry_date": rec.expiry_date.isoformat(),
                        "manufacturer": rec.manufacturer,
                    }
                    for rec in data.items
                ],
            },
        )

        return await self._reload(order.id)

    async def get_reassignment_options(
        self,
        order_id: str,
        actor: User,
        *,
        include_cheaper_with_refund: bool = False,
        include_below_paid_without_change: bool = False,
    ) -> ReassignmentOptionsOut:
        order = await self._reload(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_patient_owns_order(order, actor)
        await self._ensure_partner_response_due_at(order)

        amount_paid = self._reassignment_amount_paid(order)
        can_reassign = await self._can_reassign_pharmacy(order)
        awaiting_confirm = (
            order.payment_status == PaymentStatus.PAID
            and normalize_order_status(order.order_status) == OrderStatus.PENDING.value
            and order.pharmacy_confirmed_at is None
        )
        include_below = include_below_paid_without_change or include_cheaper_with_refund
        options: List[ReassignmentOptionOut] = []
        below_paid_count = 0
        if awaiting_confirm:
            options = await self._build_reassignment_options(
                order,
                amount_paid=amount_paid,
                include_below_paid_without_change=include_below,
            )
            if not include_below:
                with_below = await self._build_reassignment_options(
                    order,
                    amount_paid=amount_paid,
                    include_below_paid_without_change=True,
                )
                below_paid_count = sum(
                    1 for opt in with_below if opt.price_category == "below_paid"
                )

        return ReassignmentOptionsOut(
            order_id=order.id,
            amount_paid=amount_paid,
            can_reassign=can_reassign,
            switch_enabled=can_reassign,
            partner_response_due_at=order.partner_response_due_at if awaiting_confirm else None,
            below_paid_count=below_paid_count,
            options=options,
        )

    async def reassign_pharmacy(
        self, order_id: str, data: ReassignPharmacyRequest, actor: User
    ) -> Order:
        order = await self.repo.get_with_items(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_patient_owns_order(order, actor)
        await self._ensure_partner_response_due_at(order)
        if not await self._can_reassign_pharmacy(order):
            raise BusinessRuleError(
                "Pharmacy reassignment is not available for this order yet. "
                f"Partners must confirm within {_PARTNER_RESPONSE_MINUTES} minutes of payment."
            )

        amount_paid = self._reassignment_amount_paid(order)
        include_below = (
            data.accept_no_change
            or data.accept_refund_for_difference
        )
        options = await self._build_reassignment_options(
            order,
            amount_paid=amount_paid,
            include_below_paid_without_change=include_below,
        )
        match = None
        for opt in options:
            if data.pharmacy_id and opt.pharmacy_id == data.pharmacy_id:
                match = opt
                break
            if data.partner_company_id and opt.partner_company_id == data.partner_company_id:
                match = opt
                break
        if not match:
            raise ValidationError(
                "Selected pharmacy is not available for this order"
            )
        if not match.can_switch:
            if match.price_category == "above_paid":
                raise BusinessRuleError(
                    "This pharmacy costs more than you paid. "
                    "Extra payment is not available during a switch yet."
                )
            raise BusinessRuleError("This pharmacy cannot be selected for a switch.")
        if match.requires_no_change_ack and not include_below:
            raise BusinessRuleError(
                "This pharmacy is cheaper than your payment. "
                "Confirm you are okay not receiving the price difference."
            )

        new_lines = await self._resolve_lines_for_provider(
            order,
            pharmacy_id=data.pharmacy_id,
            partner_company_id=data.partner_company_id,
        )
        if not new_lines:
            raise BusinessRuleError("Selected provider cannot fulfill all order items")

        await self._release_stock_for_order(order)

        old_provider_name = await self._resolve_provider_display_name(
            order.pharmacy_id, order.partner_company_id
        )

        await self._close_partner_assignment(order, "reassigned")

        order.previous_pharmacy_id = order.pharmacy_id
        order.previous_partner_company_id = order.partner_company_id
        order.pharmacy_id = data.pharmacy_id
        order.partner_company_id = data.partner_company_id
        order.pharmacy_confirmed_at = None
        order.pharmacy_assigned_at = _now()
        order.partner_response_due_at = _now() + timedelta(minutes=_PARTNER_RESPONSE_MINUTES)
        order.reassignment_count = int(order.reassignment_count or 0) + 1
        order.dispatch_confirmed_at = None

        subtotal = 0.0
        for oi, line in zip(order.items, new_lines):
            oi.product_listing_id = line["product_listing_id"]
            oi.product_id = line.get("product_id")
            oi.product_name = line["product_name"]
            oi.unit_price = line["unit_price"]
            oi.total_price = round(line["unit_price"] * oi.quantity, 2)
            oi.dispatch_batch_number = None
            oi.dispatch_expiry_date = None
            oi.dispatch_manufacturer = None
            oi.dispatch_confirmed_at = None
            subtotal += float(oi.total_price)

        delivery_fee = float(order.delivery_fee or 0)
        commission_rate = await self._resolve_commission_rate(
            order.pharmacy_id, order.partner_company_id
        )
        commission = round(subtotal * commission_rate, 2)
        total = round(subtotal + delivery_fee, 2)
        order.subtotal = subtotal
        order.platform_commission = commission
        order.total_amount = total
        order.net_partner_amount = round(subtotal - commission, 2)
        # amount_paid_snapshot stays at the original checkout total — later switches
        # still compare against what the patient paid the first time.
        await self.db.flush()

        await self._open_partner_assignment(order)

        if order.delivery_method == DeliveryMethod.DELIVERY:
            delivery = (
                await self.db.execute(
                    select(Delivery).where(Delivery.order_id == order.id)
                )
            ).scalar_one_or_none()
            if delivery:
                await self._populate_delivery_pickup(order, delivery)
                await self.db.flush()

        await self._adjust_stock_for_items(new_lines, sign=-1)

        # Below-paid switches forfeit the difference — refunds are not issued automatically.

        notif = NotificationService(self.db)
        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await notif.pharmacy_reassigned(
                patient_user_id,
                order.id,
                provider_name=match.provider_name,
                order_code=order.order_code,
            )

        old_recipient_ids: list[str] = []
        if order.previous_pharmacy_id:
            from app.services.pharmacy_access import list_pharmacy_staff_user_ids

            old_recipient_ids = await list_pharmacy_staff_user_ids(
                self.db, order.previous_pharmacy_id
            )
        elif order.previous_partner_company_id:
            uid = await self._owner_user_id(None, order.previous_partner_company_id)
            if uid:
                old_recipient_ids = [uid]
        for uid in old_recipient_ids:
            await notif.order_reassigned_from_partner(
                uid, order.id, order_code=order.order_code
            )

        new_recipient_ids: list[str] = []
        if order.pharmacy_id:
            from app.services.pharmacy_access import list_pharmacy_staff_user_ids

            new_recipient_ids = await list_pharmacy_staff_user_ids(
                self.db, order.pharmacy_id
            )
        elif order.partner_company_id:
            uid = await self._owner_user_id(None, order.partner_company_id)
            if uid:
                new_recipient_ids = [uid]
        for uid in new_recipient_ids:
            await notif.order_placed(uid, order.id, order_code=order.order_code)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.pharmacy_reassigned",
            entity_type="Order",
            entity_id=order.id,
            new_value={
                "pharmacy_id": order.pharmacy_id,
                "partner_company_id": order.partner_company_id,
                "previous_pharmacy_id": order.previous_pharmacy_id,
                "previous_partner_company_id": order.previous_partner_company_id,
                "previous_provider_name": old_provider_name,
                "new_provider_name": match.provider_name,
                "initiated_by": "patient",
                "new_total": total,
                "amount_paid": amount_paid,
            },
        )

        return await self._reload(order.id)

    # ── Item resolution ───────────────────────────────────────────────────

    async def _items_from_recommendation(
        self, data: OrderCreate, patient_id: str
    ) -> Tuple[List[dict], Optional[str], Optional[str]]:
        rec_result = await self.db.execute(
            select(PharmacyRecommendation).where(
                PharmacyRecommendation.id == data.selected_recommendation_id
            )
        )
        rec = rec_result.scalar_one_or_none()
        if not rec:
            raise NotFoundError("Recommendation", data.selected_recommendation_id)
        if rec.patient_id != patient_id:
            raise AuthorizationError("Recommendation does not belong to this patient")
        if rec.prescription_id != data.prescription_id:
            raise ValidationError(
                "Recommendation does not match the provided prescription"
            )

        rx_result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.id == data.prescription_id)
            .options(selectinload(DigitalPrescription.items))
        )
        rx = rx_result.scalar_one_or_none()
        if not rx:
            raise NotFoundError("Prescription", data.prescription_id)
        if rx.patient_id != patient_id:
            raise AuthorizationError("Prescription does not belong to this patient")
        if not rx.items:
            raise ValidationError("Prescription has no items")

        required_product_ids = [it.product_id for it in rx.items if it.product_id]
        if not required_product_ids:
            raise ValidationError("Prescription items have no linked products")

        listings_q = select(ProductListing).where(
            ProductListing.product_id.in_(required_product_ids),
            ProductListing.status == EntityStatus.ACTIVE,
            ProductListing.availability_status == ListingAvailability.AVAILABLE,
            ProductListing.stock_quantity > 0,
        )
        if rec.pharmacy_id:
            listings_q = listings_q.where(ProductListing.pharmacy_id == rec.pharmacy_id)
        elif rec.partner_company_id:
            listings_q = listings_q.where(
                ProductListing.partner_company_id == rec.partner_company_id
            )
        else:
            raise BusinessRuleError("Recommendation has no provider")

        listings_q = listings_q.options(selectinload(ProductListing.product))
        listings_res = await self.db.execute(listings_q)
        listings = list(listings_res.scalars().all())

        # Pick cheapest active listing per product
        by_product: dict[str, ProductListing] = {}
        for lst in listings:
            if lst.expiry_date:
                expiry = lst.expiry_date
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if expiry <= _now():
                    continue
            if lst.product and lst.product.approval_status != ProductApprovalStatus.APPROVED:
                continue
            current = by_product.get(lst.product_id)
            if current is None or float(lst.price) < float(current.price):
                by_product[lst.product_id] = lst

        items: List[dict] = []
        for rx_item in rx.items:
            if not rx_item.product_id:
                continue
            lst = by_product.get(rx_item.product_id)
            qty = max(1, int(rx_item.quantity or 1))
            if lst is None:
                raise BusinessRuleError(
                    f"Selected provider cannot fulfill '{rx_item.medicine_name}'"
                )
            if lst.stock_quantity < qty:
                raise BusinessRuleError(
                    f"Insufficient stock for '{rx_item.medicine_name}'"
                )
            suggested_dosage, suggested_notes = _suggested_dispatch_from_rx_item(rx_item)
            items.append(
                {
                    "product_listing_id": lst.id,
                    "product_id": lst.product_id,
                    "product_name": lst.product.name if lst.product else rx_item.medicine_name,
                    "quantity": qty,
                    "unit_price": float(lst.price),
                    "dispatch_dosage": suggested_dosage,
                    "dispatch_notes": suggested_notes,
                }
            )

        return items, rec.pharmacy_id, rec.partner_company_id

    async def _items_from_request_items(
        self, data: OrderCreate, *, patient_id: str
    ) -> Tuple[List[dict], Optional[str], Optional[str]]:
        assert data.items is not None
        listing_ids = [it.product_listing_id for it in data.items if it.product_listing_id]

        listings_by_id: dict[str, ProductListing] = {}
        if listing_ids:
            res = await self.db.execute(
                select(ProductListing)
                .where(ProductListing.id.in_(listing_ids))
                .options(selectinload(ProductListing.product))
            )
            for lst in res.scalars().all():
                listings_by_id[lst.id] = lst

        items: List[dict] = []
        pharmacy_id: Optional[str] = data.pharmacy_id
        partner_id: Optional[str] = data.partner_company_id
        derived_pharmacy: Optional[str] = None
        derived_partner: Optional[str] = None

        for raw in data.items:
            if raw.product_listing_id:
                lst = listings_by_id.get(raw.product_listing_id)
                if lst is None:
                    raise NotFoundError("ProductListing", raw.product_listing_id)
                if lst.status != EntityStatus.ACTIVE:
                    raise BusinessRuleError(
                        f"Listing {lst.id} is not active"
                    )
                if lst.availability_status not in (
                    ListingAvailability.AVAILABLE,
                    ListingAvailability.LOW_STOCK,
                ):
                    raise BusinessRuleError(
                        f"Listing {lst.id} is not available"
                    )
                if lst.expiry_date:
                    expiry = lst.expiry_date
                    if expiry.tzinfo is None:
                        expiry = expiry.replace(tzinfo=timezone.utc)
                    if expiry <= _now():
                        raise BusinessRuleError(
                            f"Listing {lst.id} has expired stock"
                        )
                unit_price, stock_units, sell_mode = resolve_order_line(
                    lst,
                    lst.product,
                    raw.quantity,
                    str(raw.sell_mode.value if hasattr(raw.sell_mode, "value") else raw.sell_mode),
                    # Pharmacist-prepared prescription carts may contain sub-minimum
                    # partial quantities (e.g. a short course). Skip the minimum only
                    # for prescription orders; normal direct orders still enforce it.
                    skip_min_quantity=bool(data.prescription_id),
                )
                if lst.stock_quantity < stock_units:
                    raise BusinessRuleError(
                        f"Insufficient stock for listing {lst.id}"
                    )
                if (
                    lst.product
                    and lst.product.approval_status != ProductApprovalStatus.APPROVED
                ):
                    raise BusinessRuleError(
                        f"Product for listing {lst.id} is not approved"
                    )

                # All listings must share the same owner
                if lst.pharmacy_id:
                    if derived_pharmacy and derived_pharmacy != lst.pharmacy_id:
                        raise BusinessRuleError(
                            "All items must come from the same pharmacy"
                        )
                    if derived_partner:
                        raise BusinessRuleError(
                            "Cannot mix pharmacy and partner listings"
                        )
                    derived_pharmacy = lst.pharmacy_id
                elif lst.partner_company_id:
                    if derived_partner and derived_partner != lst.partner_company_id:
                        raise BusinessRuleError(
                            "All items must come from the same partner company"
                        )
                    if derived_pharmacy:
                        raise BusinessRuleError(
                            "Cannot mix pharmacy and partner listings"
                        )
                    derived_partner = lst.partner_company_id

                items.append(
                    {
                        "product_listing_id": lst.id,
                        "product_id": lst.product_id,
                        "product_name": lst.product.name if lst.product else "Item",
                        "quantity": raw.quantity,
                        "sell_mode": sell_mode,
                        "unit_price": unit_price,
                        "stock_units": stock_units,
                    }
                )
            else:
                # Legacy path — trust client price/name. Used by older tests
                # that pre-date listing-based ordering.
                items.append(
                    {
                        "product_listing_id": None,
                        "product_id": raw.product_id,
                        "product_name": raw.product_name or "Item",
                        "quantity": raw.quantity,
                        "unit_price": float(raw.unit_price or 0.0),
                    }
                )

        if derived_pharmacy:
            pharmacy_id = derived_pharmacy
            partner_id = None
        elif derived_partner:
            partner_id = derived_partner
            pharmacy_id = None

        self._assert_unique_sell_mode_per_product(items)

        return items, pharmacy_id, partner_id

    @staticmethod
    def _assert_unique_sell_mode_per_product(items: List[dict]) -> None:
        """One product cannot appear as both pack and partial on the same order."""
        modes_by_product: dict[str, set[str]] = {}
        for it in items:
            product_id = it.get("product_id")
            if not product_id:
                continue
            mode = str(it.get("sell_mode") or SellMode.PACK.value)
            seen = modes_by_product.setdefault(product_id, set())
            if seen and mode not in seen:
                raise BusinessRuleError(
                    "Each product must be ordered as either a whole pack or "
                    "partial units, not both."
                )
            seen.add(mode)

    # ── Access control ────────────────────────────────────────────────────

    async def _assert_can_view(self, order: Order, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role == UserRole.PATIENT:
            patient = await self._get_patient_for_user(actor)
            if patient and patient.id == order.patient_id:
                return
            raise AuthorizationError("Not allowed to view this order")
        if role == UserRole.PHARMACIST:
            # Internal Farumasi pharmacists monitor all orders read-only (RX + partner).
            return
        if role == UserRole.PHARMACY_ADMIN:
            pharmacy = await self._get_owned_pharmacy(actor)
            if order.pharmacy_id and pharmacy and await self._owns_pharmacy(actor, order.pharmacy_id):
                return
            if order.partner_company_id and await self._owns_partner(
                actor, order.partner_company_id
            ):
                return
            raise AuthorizationError("Not allowed to view this order")
        if role == UserRole.PARTNER_COMPANY_ADMIN:
            if order.partner_company_id and await self._owns_partner(
                actor, order.partner_company_id
            ):
                return
            raise AuthorizationError("Not allowed to view this order")
        raise AuthorizationError("Not allowed to view this order")

    async def _assert_can_change_status(
        self, order: Order, actor: User, new_status: str
    ) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role == UserRole.PATIENT:
            patient = await self._get_patient_for_user(actor)
            owns = patient and patient.id == order.patient_id
            # Patients can self-cancel as long as the order has not yet been
            # handed to a rider or collected.
            #   PENDING / ACCEPTED / PREPARING  → always cancellable (pharmacy
            #     hasn't done significant work yet; refund will be issued for
            #     paid orders via finance workflow).
            #   READY_FOR_PICKUP → only if not yet paid (i.e. pharmacy queued
            #     it but payment wasn't taken — uncommon but valid).
            #   OUT_FOR_DELIVERY / DELIVERED / COMPLETED → cannot cancel.
            always_cancellable = {
                OrderStatus.PENDING,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
            }
            if (
                owns
                and new_status == OrderStatus.CANCELLED
                and order.order_status in always_cancellable
            ):
                return
            # READY_FOR_PICKUP is still cancellable when not yet paid
            if (
                owns
                and new_status == OrderStatus.CANCELLED
                and order.order_status == OrderStatus.READY_FOR_PICKUP
                and order.payment_status != PaymentStatus.PAID
            ):
                return
            raise AuthorizationError(
                "Orders that are already out for delivery or delivered cannot be cancelled by patients"
            )
        if role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
            pharmacy = await self._get_owned_pharmacy(actor)
            if not pharmacy and role == UserRole.PHARMACIST:
                raise AuthorizationError(
                    "Farumasi pharmacists have read-only access to orders. "
                    "Partner pharmacies manage store order fulfilment."
                )
            if order.pharmacy_id and await self._owns_pharmacy(actor, order.pharmacy_id):
                if new_status in _OWNER_MANAGE_STATUSES:
                    return
            raise AuthorizationError("Not allowed to change this order's status")
        if role == UserRole.PARTNER_COMPANY_ADMIN:
            if order.partner_company_id and await self._owns_partner(
                actor, order.partner_company_id
            ):
                if new_status in _OWNER_MANAGE_STATUSES:
                    return
            raise AuthorizationError("Not allowed to change this order's status")
        raise AuthorizationError("Not allowed to change this order's status")

    async def _assert_paid_before_fulfilment(
        self, order: Order, new_status: str, actor: User
    ) -> None:
        """Block partner fulfilment until patient MoMo payment is confirmed."""
        if actor.role == UserRole.SUPER_ADMIN:
            return
        no_payment_needed = {
            OrderStatus.PENDING,
            OrderStatus.CANCELLED,
            OrderStatus.REJECTED,
            OrderStatus.FAILED,
        }
        if new_status in no_payment_needed:
            return
        if order.payment_status != PaymentStatus.PAID:
            raise BusinessRuleError(
                "Payment must be confirmed before fulfilment. "
                "The patient must complete mobile money payment first."
            )

    async def _calculate_order_delivery_fee(
        self,
        data: "OrderCreate",
        pharmacy_id: Optional[str],
        partner_id: Optional[str],
    ) -> Tuple[float, Optional[float]]:
        """
        Compute delivery fee + road distance using OSRM with Haversine fallback.
        Returns (fee_rwf, distance_km).
        Raises ValidationError if distance > 20 km from outside Kigali (pickup-only zone).
        """
        dest_lat = data.delivery_latitude
        dest_lon = data.delivery_longitude
        if dest_lat is None or dest_lon is None:
            cfg = await PlatformSettingsService(self.db).get_delivery_config()
            tiers = cfg.get("tiers") or []
            default_fee = float(tiers[0]["fee_rwf"]) if tiers else 1500.0
            return default_fee, None

        seller_lat: Optional[float] = None
        seller_lon: Optional[float] = None

        if pharmacy_id:
            ph_res = await self.db.execute(
                select(Pharmacy.latitude, Pharmacy.longitude).where(Pharmacy.id == pharmacy_id)
            )
            row = ph_res.one_or_none()
            if row:
                seller_lat, seller_lon = row
        elif partner_id:
            pt_res = await self.db.execute(
                select(PartnerCompany.latitude, PartnerCompany.longitude).where(
                    PartnerCompany.id == partner_id
                )
            )
            row = pt_res.one_or_none()
            if row:
                seller_lat, seller_lon = row

        if seller_lat is None or seller_lon is None:
            cfg = await PlatformSettingsService(self.db).get_delivery_config()
            tiers = cfg.get("tiers") or []
            default_fee = float(tiers[0]["fee_rwf"]) if tiers else 1500.0
            return default_fee, None

        cfg = await PlatformSettingsService(self.db).get_delivery_config()
        max_km = float(cfg.get("max_delivery_km", 20))

        if is_outside_kigali(dest_lat, dest_lon):
            raise ValidationError(
                "Delivery is only available within Kigali city limits. "
                "Your location appears outside our delivery area — please choose pickup."
            )

        dist = await road_distance_km(float(seller_lat), float(seller_lon), dest_lat, dest_lon)

        if dist > max_km:
            raise ValidationError(
                f"Delivery is not available beyond {max_km:.0f} km from the pharmacy "
                f"({dist:.1f} km). Please choose pickup."
            )

        fee = calculate_delivery_fee_from_config(dist, cfg)
        return fee, dist

    async def _populate_delivery_pickup(self, order: Order, delivery: Delivery) -> None:
        if order.pharmacy_id:
            ph = (
                await self.db.execute(
                    select(Pharmacy).where(Pharmacy.id == order.pharmacy_id)
                )
            ).scalar_one_or_none()
            if ph:
                delivery.pickup_address = ", ".join(
                    p for p in (ph.address, ph.district, "Kigali") if p
                ) or ph.name
                delivery.pickup_latitude = ph.latitude
                delivery.pickup_longitude = ph.longitude
        elif order.partner_company_id:
            partner = (
                await self.db.execute(
                    select(PartnerCompany).where(PartnerCompany.id == order.partner_company_id)
                )
            ).scalar_one_or_none()
            if partner:
                delivery.pickup_address = ", ".join(
                    p for p in (partner.address, partner.district, "Kigali") if p
                ) or partner.name
                delivery.pickup_latitude = partner.latitude
                delivery.pickup_longitude = partner.longitude

    async def _assert_can_update_payment(self, order: Order, actor: User) -> None:
        role = actor.role
        if role in (UserRole.SUPER_ADMIN, UserRole.FINANCE_ADMIN):
            return
        raise AuthorizationError(
            "Payment status can only be updated by finance after provider reconciliation"
        )

    async def _assert_can_verify_access_code(self, order: Order, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role == UserRole.RIDER:
            rider_res = await self.db.execute(
                select(RiderProfile).where(RiderProfile.user_id == actor.id)
            )
            rider = rider_res.scalar_one_or_none()
            if not rider:
                raise AuthorizationError("Not allowed to verify access code")
            delivery_res = await self.db.execute(
                select(Delivery).where(
                    Delivery.order_id == order.id,
                    Delivery.rider_id == rider.id,
                )
            )
            if delivery_res.scalar_one_or_none():
                return
            raise AuthorizationError("Not allowed to verify access code")
        if role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
            pharmacy = await self._get_owned_pharmacy(actor)
            if not pharmacy and role == UserRole.PHARMACIST:
                from app.services.pharmacy_access import resolve_user_pharmacy

                pharmacy = await resolve_user_pharmacy(self.db, actor)
            if pharmacy and order.pharmacy_id == pharmacy.id:
                return
        if role == UserRole.PARTNER_COMPANY_ADMIN:
            if order.partner_company_id and await self._owns_partner(
                actor, order.partner_company_id
            ):
                return
        raise AuthorizationError("Not allowed to verify access code")

    # ── Helpers ───────────────────────────────────────────────────────────

    async def _get_patient_for_user(self, actor: User) -> Optional[PatientProfile]:
        res = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        return res.scalar_one_or_none()

    async def _get_owned_pharmacy(self, actor: User) -> Optional[Pharmacy]:
        from app.services.pharmacy_access import resolve_user_pharmacy

        return await resolve_user_pharmacy(self.db, actor)

    async def _get_owned_partner(self, actor: User) -> Optional[PartnerCompany]:
        res = await self.db.execute(
            select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id)
        )
        return res.scalar_one_or_none()

    async def _owns_pharmacy(self, actor: User, pharmacy_id: str) -> bool:
        from app.services.pharmacy_access import user_owns_pharmacy

        return await user_owns_pharmacy(self.db, actor, pharmacy_id)

    async def _owns_partner(self, actor: User, partner_id: str) -> bool:
        from app.services.partner_access import user_owns_partner

        return await user_owns_partner(self.db, actor, partner_id)

    async def _owner_user_id(
        self, pharmacy_id: Optional[str], partner_id: Optional[str]
    ) -> Optional[str]:
        if pharmacy_id:
            res = await self.db.execute(
                select(Pharmacy.owner_user_id).where(Pharmacy.id == pharmacy_id)
            )
            return res.scalar_one_or_none()
        if partner_id:
            res = await self.db.execute(
                select(PartnerCompany.owner_user_id).where(
                    PartnerCompany.id == partner_id
                )
            )
            return res.scalar_one_or_none()
        return None

    async def _patient_user_id(self, patient_id: str) -> Optional[str]:
        res = await self.db.execute(
            select(PatientProfile.user_id).where(PatientProfile.id == patient_id)
        )
        return res.scalar_one_or_none()

    def _order_options(self):
        """Common eager-load options: items, patient, pharmacy name, delivery + rider."""
        return [
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.pharmacy),
            selectinload(Order.partner_company),
            selectinload(Order.patient).selectinload(PatientProfile.user),
            selectinload(Order.prescription),
            selectinload(Order.delivery).selectinload(Delivery.rider).selectinload(
                RiderProfile.user
            ),
        ]

    async def list_order_activity(
        self, order_id: str, actor: User
    ) -> list:
        """Audit trail for a single order (all actors who touched it)."""
        from app.models.audit import AuditLog
        from app.models.user import User as UserModel

        order = await self._reload(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_view(order, actor)

        stmt = (
            select(AuditLog, UserModel)
            .outerjoin(UserModel, UserModel.id == AuditLog.actor_user_id)
            .where(
                AuditLog.entity_type == "Order",
                AuditLog.entity_id == order_id,
            )
            .order_by(AuditLog.created_at.asc())
        )
        rows = (await self.db.execute(stmt)).all()
        out = []
        for log, user in rows:
            out.append(
                {
                    "id": log.id,
                    "action": log.action,
                    "entity_type": log.entity_type,
                    "entity_id": log.entity_id,
                    "old_value": log.old_value,
                    "new_value": log.new_value,
                    "created_at": log.created_at,
                    "actor_user_id": log.actor_user_id,
                    "actor_name": user.full_name if user else None,
                    "actor_role": user.role if user else None,
                }
            )
        return out

    async def list_partner_assignments(
        self, order_id: str, actor: User
    ) -> list:
        """Pharmacy/partner assignment ledger for an order (includes switches)."""
        order = await self._reload(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_view(order, actor)

        stmt = (
            select(OrderPartnerAssignment)
            .where(OrderPartnerAssignment.order_id == order_id)
            .options(
                selectinload(OrderPartnerAssignment.pharmacy),
                selectinload(OrderPartnerAssignment.partner_company),
            )
            .order_by(OrderPartnerAssignment.assigned_at.asc())
        )
        rows = (await self.db.execute(stmt)).scalars().all()
        out = []
        for row in rows:
            name = None
            if row.pharmacy:
                name = row.pharmacy.name
            elif row.partner_company:
                name = row.partner_company.name
            out.append(
                {
                    "id": row.id,
                    "order_id": row.order_id,
                    "pharmacy_id": row.pharmacy_id,
                    "partner_company_id": row.partner_company_id,
                    "provider_name": name or "Unknown partner",
                    "subtotal": float(row.subtotal),
                    "net_partner_amount": float(row.net_partner_amount),
                    "assigned_at": row.assigned_at,
                    "ended_at": row.ended_at,
                    "end_reason": row.end_reason,
                    "is_current": row.ended_at is None,
                }
            )
        return out

    async def _reload(self, order_id: str) -> Optional[Order]:
        res = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(*self._order_options())
        )
        return res.scalar_one_or_none()

    async def _paginate(
        self,
        *conds,
        offset: int,
        limit: int,
        pending_confirmation_first: bool = False,
    ) -> Tuple[List[Order], int]:
        count_q = select(func.count(Order.id))
        if conds:
            count_q = count_q.where(*conds)
        total = (await self.db.execute(count_q)).scalar_one()

        q = select(Order).options(*self._order_options())
        if conds:
            q = q.where(*conds)
        if pending_confirmation_first:
            awaiting = and_(
                Order.order_status == OrderStatus.PENDING.value,
                Order.pharmacy_confirmed_at.is_(None),
            )
            q = q.order_by(
                case((awaiting, 0), else_=1),
                Order.created_at.desc(),
            )
        else:
            q = q.order_by(Order.created_at.desc())
        q = q.offset(offset).limit(limit)
        res = await self.db.execute(q)
        return list(res.scalars().all()), int(total)

    async def _resolve_commission_rate(
        self,
        pharmacy_id: Optional[str],
        partner_id: Optional[str],
    ) -> float:
        """Decimal commission rate from seller agreement, else platform default."""
        if pharmacy_id:
            pct = (
                await self.db.execute(
                    select(Pharmacy.commission_rate_percent).where(
                        Pharmacy.id == pharmacy_id
                    )
                )
            ).scalar_one_or_none()
            if pct is not None:
                return float(pct) / 100.0
        if partner_id:
            pct = (
                await self.db.execute(
                    select(PartnerCompany.commission_rate_percent).where(
                        PartnerCompany.id == partner_id
                    )
                )
            ).scalar_one_or_none()
            if pct is not None:
                return float(pct) / 100.0
        return settings.PLATFORM_COMMISSION_RATE

    async def _requires_physical_prescription(self, order: Order) -> bool:
        if order.prescription is not None:
            return bool(order.prescription.requires_physical_collection)
        if not order.prescription_id:
            return False
        rx = await self.db.get(DigitalPrescription, order.prescription_id)
        return bool(rx and rx.requires_physical_collection)

    async def _credit_partner_revenue(self, order: Order) -> None:
        await self._create_revenue(order)

    async def _mark_partner_fulfilled(self, order: Order, *, end_reason: str) -> None:
        if order.partner_fulfilled_at is None:
            order.partner_fulfilled_at = _now()
            await self.db.flush()
        await self._credit_partner_revenue(order)
        await self._close_partner_assignment(order, end_reason)

    async def _create_revenue(self, order: Order) -> None:
        """Create a revenue record when order is completed.

        Gross = product subtotal (order revenue). Commission is deducted once;
        net_amount is the partner's full earning. Withdrawals draw from net only.
        """
        if order.payment_status != PaymentStatus.PAID:
            return

        existing = await self.db.execute(
            select(RevenueRecord).where(RevenueRecord.order_id == order.id)
        )
        if existing.scalar_one_or_none():
            return

        partner_type = "pharmacy" if order.pharmacy_id else "partner_company"
        self.db.add(
            RevenueRecord(
                order_id=order.id,
                partner_type=partner_type,
                pharmacy_id=order.pharmacy_id,
                partner_company_id=order.partner_company_id,
                gross_amount=order.subtotal,
                platform_commission=order.platform_commission,
                net_amount=order.net_partner_amount,
                status=RevenueStatus.AVAILABLE,
            )
        )
        await self.db.flush()
        # Partner assignment closure is handled by the fulfilment action (pickup, rider handover).

    async def _open_partner_assignment(self, order: Order) -> None:
        self.db.add(
            OrderPartnerAssignment(
                order_id=order.id,
                pharmacy_id=order.pharmacy_id,
                partner_company_id=order.partner_company_id,
                subtotal=float(order.subtotal or 0),
                platform_commission=float(order.platform_commission or 0),
                net_partner_amount=float(order.net_partner_amount or 0),
                assigned_at=_now(),
            )
        )
        await self.db.flush()

    async def _close_partner_assignment(self, order: Order, reason: str) -> None:
        res = await self.db.execute(
            select(OrderPartnerAssignment).where(
                OrderPartnerAssignment.order_id == order.id,
                OrderPartnerAssignment.ended_at.is_(None),
            )
        )
        row = res.scalar_one_or_none()
        if not row:
            return
        row.ended_at = _now()
        row.end_reason = reason
        await self.db.flush()

    async def _resolve_provider_display_name(
        self,
        pharmacy_id: Optional[str],
        partner_company_id: Optional[str],
    ) -> str:
        if pharmacy_id:
            row = await self.db.get(Pharmacy, pharmacy_id)
            if row and row.name:
                return row.name
        if partner_company_id:
            row = await self.db.get(PartnerCompany, partner_company_id)
            if row and row.name:
                return row.name
        return "Previous partner"

    # ── Stock reservation & prescription validation ───────────────────────

    @staticmethod
    def _reassignment_amount_paid(order: Order) -> float:
        """Original patient payment; unchanged after cheaper reassignments."""
        return float(order.amount_paid_snapshot or order.total_amount or 0)

    async def _can_reassign_pharmacy(self, order: Order) -> bool:
        if order.payment_status != PaymentStatus.PAID:
            return False
        if normalize_order_status(order.order_status) != OrderStatus.PENDING.value:
            return False
        if order.pharmacy_confirmed_at is not None:
            return False
        due = await self._partner_response_deadline(order)
        return due is not None and _now() >= due

    async def _partner_response_anchor(self, order: Order) -> Optional[datetime]:
        """Deadline starts at confirmed payment time — never at order creation."""
        paid_at = await self._order_paid_at(order.id)
        if not paid_at:
            return None
        if paid_at.tzinfo is None:
            paid_at = paid_at.replace(tzinfo=timezone.utc)
        return paid_at

    async def _partner_response_deadline(self, order: Order) -> Optional[datetime]:
        """Paid + pending + unconfirmed orders get a deadline anchored at payment time."""
        if order.payment_status != PaymentStatus.PAID:
            return None
        if normalize_order_status(order.order_status) != OrderStatus.PENDING.value:
            return None
        if order.pharmacy_confirmed_at is not None:
            return None
        await self._ensure_partner_response_due_at(order)
        if not order.partner_response_due_at:
            return None
        due = order.partner_response_due_at
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return due

    async def _ensure_partner_response_due_at(self, order: Order) -> None:
        """Backfill or correct the pharmacy response deadline for paid, unconfirmed orders."""
        if order.payment_status != PaymentStatus.PAID:
            if order.partner_response_due_at is not None:
                order.partner_response_due_at = None
                await self.db.flush()
            return
        if normalize_order_status(order.order_status) != OrderStatus.PENDING.value:
            if order.partner_response_due_at is not None:
                order.partner_response_due_at = None
                await self.db.flush()
            return
        if order.pharmacy_confirmed_at is not None:
            if order.partner_response_due_at is not None:
                order.partner_response_due_at = None
                await self.db.flush()
            return

        anchor = await self._partner_response_anchor(order)
        if anchor is None:
            if order.partner_response_due_at is not None:
                order.partner_response_due_at = None
                await self.db.flush()
            return

        canonical_due = anchor + timedelta(minutes=_PARTNER_RESPONSE_MINUTES)

        if order.partner_response_due_at:
            existing = order.partner_response_due_at
            if existing.tzinfo is None:
                existing = existing.replace(tzinfo=timezone.utc)
            # A retry or late webhook must not keep the deadline in the future after payment + window.
            if _now() >= canonical_due and existing > canonical_due:
                order.partner_response_due_at = canonical_due
                await self.db.flush()
            return

        order.partner_response_due_at = canonical_due
        await self.db.flush()

    async def _order_paid_at(self, order_id: str) -> Optional[datetime]:
        from app.models.payment_transaction import PaymentTransaction

        result = await self.db.execute(
            select(PaymentTransaction.paid_at)
            .where(
                PaymentTransaction.order_id == order_id,
                PaymentTransaction.paid_at.isnot(None),
            )
            .order_by(PaymentTransaction.paid_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _required_products_for_order(
        self, order: Order
    ) -> List[Tuple[str, int, str, str]]:
        """Return (product_id, qty, sell_mode, name) tuples used to match pharmacies."""
        required: List[Tuple[str, int, str, str]] = []
        listing_ids: list[str] = []
        items_by_listing: dict[str, object] = {}

        for oi in order.items:
            if oi.product_id:
                required.append(
                    (oi.product_id, oi.quantity, oi.sell_mode or "pack", oi.product_name)
                )
            elif oi.product_listing_id:
                listing_ids.append(oi.product_listing_id)
                items_by_listing[oi.product_listing_id] = oi

        if listing_ids:
            res = await self.db.execute(
                select(ProductListing).where(ProductListing.id.in_(listing_ids))
            )
            for lst in res.scalars().all():
                oi = items_by_listing.get(lst.id)
                if lst.product_id and oi is not None:
                    required.append(
                        (
                            lst.product_id,
                            oi.quantity,
                            oi.sell_mode or "pack",
                            oi.product_name,
                        )
                    )
        return required

    async def _assert_patient_owns_order(self, order: Order, actor: User) -> None:
        if actor.role == UserRole.SUPER_ADMIN:
            return
        if actor.role != UserRole.PATIENT:
            raise AuthorizationError("Only the patient may perform this action")
        patient = await self._get_patient_for_user(actor)
        if not patient or patient.id != order.patient_id:
            raise AuthorizationError("Not allowed for this order")

    async def _build_reassignment_options(
        self,
        order: Order,
        *,
        amount_paid: float,
        include_below_paid_without_change: bool,
    ) -> List[ReassignmentOptionOut]:
        from app.services.recommendation_service import RecommendationService
        from app.utils.scoring import score_providers

        required = await self._required_products_for_order(order)
        if not required:
            return []

        delivery_fee = float(order.delivery_fee or 0)
        providers = await self._list_fulfillment_providers(
            required,
            exclude_pharmacy_id=order.pharmacy_id,
            exclude_partner_id=order.partner_company_id,
        )
        if not providers:
            return []

        product_ids = [pid for pid, _, _, _ in required if pid]
        patient_insurance_id: Optional[str] = None
        if order.patient_id:
            from app.models.patient import PatientProfile

            pres = await self.db.execute(
                select(PatientProfile.insurance_provider_id).where(
                    PatientProfile.id == order.patient_id
                )
            )
            patient_insurance_id = pres.scalar_one_or_none()

        lat = float(order.delivery_latitude) if order.delivery_latitude is not None else -1.9441
        lon = float(order.delivery_longitude) if order.delivery_longitude is not None else 30.0619
        preferred_delivery = order.delivery_method == DeliveryMethod.DELIVERY

        rec_svc = RecommendationService(self.db)
        candidates = await rec_svc._build_candidates(product_ids)
        candidates = [
            c
            for c in candidates
            if not (
                (c.provider_type == "pharmacy" and c.provider_id == order.pharmacy_id)
                or (c.provider_type == "partner" and c.provider_id == order.partner_company_id)
            )
        ]
        if patient_insurance_id:
            candidates = [
                c
                for c in candidates
                if patient_insurance_id in c.accepted_insurance_ids
            ]
        scored = score_providers(
            candidates,
            product_ids,
            lat,
            lon,
            patient_insurance_provider_id=patient_insurance_id,
            preferred_delivery=preferred_delivery,
        )
        rank_map: dict[tuple[str, str], tuple[int, object]] = {}
        for s in scored:
            if not s.can_fulfill_complete_prescription:
                continue
            key = (s.provider_type, s.provider_id)
            if key not in rank_map:
                rank_map[key] = (len(rank_map) + 1, s)

        options: List[ReassignmentOptionOut] = []
        for provider in providers:
            pharmacy_id = provider.get("pharmacy_id")
            partner_id = provider.get("partner_company_id")
            provider_type = "pharmacy" if pharmacy_id else "partner"
            provider_key = (provider_type, pharmacy_id or partner_id or "")
            rank_info = rank_map.get(provider_key)
            # Only pharmacies that can fulfill the full cart (and pass insurance filter).
            if rank_info is None:
                continue

            subtotal = provider["subtotal"]
            total = round(subtotal + delivery_fee, 2)
            diff = round(amount_paid - total, 2)

            if total > amount_paid + _REASSIGN_PRICE_TOLERANCE:
                price_category = "above_paid"
                forfeit_amount = 0.0
                extra_payment = round(total - amount_paid, 2)
                can_switch = False
                requires_no_change = False
            elif diff > _REASSIGN_PRICE_TOLERANCE:
                price_category = "below_paid"
                forfeit_amount = diff
                extra_payment = 0.0
                can_switch = True
                requires_no_change = True
                if not include_below_paid_without_change:
                    continue
            else:
                price_category = "within_paid"
                forfeit_amount = 0.0
                extra_payment = 0.0
                can_switch = True
                requires_no_change = False

            ai_rank = rank_info[0] if rank_info else None
            scored_row = rank_info[1] if rank_info else None
            ai_score = float(scored_row.total_score) if scored_row else None
            ai_reasons = list(scored_row.reasons[:3]) if scored_row else []

            options.append(
                ReassignmentOptionOut(
                    pharmacy_id=pharmacy_id,
                    partner_company_id=partner_id,
                    provider_name=provider["name"],
                    estimated_subtotal=subtotal,
                    delivery_fee=delivery_fee,
                    estimated_total=total,
                    amount_paid=amount_paid,
                    requires_refund=requires_no_change,
                    refund_amount=forfeit_amount if requires_no_change else 0.0,
                    price_category=price_category,
                    can_switch=can_switch,
                    requires_no_change_ack=requires_no_change,
                    forfeit_amount=forfeit_amount,
                    extra_payment_required=extra_payment,
                    ai_rank=ai_rank,
                    ai_score=ai_score,
                    ai_reasons=ai_reasons,
                )
            )

        options.sort(
            key=lambda o: (
                not o.can_switch,
                o.ai_rank is None,
                o.ai_rank if o.ai_rank is not None else 999,
                o.estimated_total,
                o.provider_name,
            )
        )
        return options

    async def _list_fulfillment_providers(
        self,
        required: Sequence[Tuple[Optional[str], int, str, str]],
        *,
        exclude_pharmacy_id: Optional[str],
        exclude_partner_id: Optional[str],
    ) -> List[dict]:
        now = _now()
        product_ids = {pid for pid, _, _, _ in required if pid}
        if not product_ids:
            return []

        listings_res = await self.db.execute(
            select(ProductListing)
            .where(
                ProductListing.product_id.in_(product_ids),
                ProductListing.status == EntityStatus.ACTIVE,
                ProductListing.availability_status == ListingAvailability.AVAILABLE,
                ProductListing.stock_quantity > 0,
            )
            .options(selectinload(ProductListing.product))
        )
        listings = list(listings_res.scalars().all())

        by_pharmacy: dict[str, list] = {}
        by_partner: dict[str, list] = {}
        pharmacy_names: dict[str, str] = {}
        partner_names: dict[str, str] = {}

        for lst in listings:
            if not self._listing_eligible(lst, now):
                continue
            if lst.pharmacy_id:
                if lst.pharmacy_id == exclude_pharmacy_id:
                    continue
                by_pharmacy.setdefault(lst.pharmacy_id, []).append(lst)
            elif lst.partner_company_id:
                if lst.partner_company_id == exclude_partner_id:
                    continue
                by_partner.setdefault(lst.partner_company_id, []).append(lst)

        if by_pharmacy:
            ph_res = await self.db.execute(
                select(Pharmacy).where(
                    Pharmacy.id.in_(by_pharmacy.keys()),
                    Pharmacy.status == EntityStatus.ACTIVE,
                )
            )
            for ph in ph_res.scalars().all():
                if ph.is_open:
                    pharmacy_names[ph.id] = ph.name

        if by_partner:
            pt_res = await self.db.execute(
                select(PartnerCompany).where(
                    PartnerCompany.id.in_(by_partner.keys()),
                    PartnerCompany.status == EntityStatus.ACTIVE,
                )
            )
            for pt in pt_res.scalars().all():
                if pt.is_open:
                    partner_names[pt.id] = pt.name

        providers: List[dict] = []
        for pharmacy_id, ph_listings in by_pharmacy.items():
            name = pharmacy_names.get(pharmacy_id)
            if not name:
                continue
            subtotal = self._quote_subtotal(required, ph_listings)
            if subtotal is None:
                continue
            providers.append(
                {"pharmacy_id": pharmacy_id, "partner_company_id": None, "name": name, "subtotal": subtotal}
            )

        for partner_id, pt_listings in by_partner.items():
            name = partner_names.get(partner_id)
            if not name:
                continue
            subtotal = self._quote_subtotal(required, pt_listings)
            if subtotal is None:
                continue
            providers.append(
                {"pharmacy_id": None, "partner_company_id": partner_id, "name": name, "subtotal": subtotal}
            )
        return providers

    @staticmethod
    def _listing_eligible(lst: ProductListing, now: datetime) -> bool:
        if lst.expiry_date:
            expiry = lst.expiry_date
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry <= now:
                return False
        if lst.product and lst.product.approval_status != ProductApprovalStatus.APPROVED:
            return False
        return True

    @staticmethod
    def _quote_subtotal(
        required: Sequence[Tuple[Optional[str], int, str, str]],
        listings: Sequence[ProductListing],
    ) -> Optional[float]:
        by_product: dict[str, list[ProductListing]] = {}
        for lst in listings:
            by_product.setdefault(lst.product_id, []).append(lst)

        subtotal = 0.0
        for product_id, qty, sell_mode, _name in required:
            if not product_id:
                return None
            candidates = by_product.get(product_id, [])
            best: Optional[ProductListing] = None
            for lst in candidates:
                if lst.stock_quantity < qty:
                    continue
                if best is None or float(lst.price) < float(best.price):
                    best = lst
            if best is None:
                return None
            subtotal += float(best.price) * qty
        return round(subtotal, 2)

    async def _resolve_lines_for_provider(
        self,
        order: Order,
        *,
        pharmacy_id: Optional[str],
        partner_company_id: Optional[str],
    ) -> List[dict]:
        lines: List[dict] = []
        for oi in order.items:
            if not oi.product_id:
                raise BusinessRuleError(f"Cannot reassign item without product: {oi.product_name}")
            q = select(ProductListing).where(
                ProductListing.product_id == oi.product_id,
                ProductListing.status == EntityStatus.ACTIVE,
                ProductListing.availability_status == ListingAvailability.AVAILABLE,
                ProductListing.stock_quantity >= oi.quantity,
            )
            if pharmacy_id:
                q = q.where(ProductListing.pharmacy_id == pharmacy_id)
            else:
                q = q.where(ProductListing.partner_company_id == partner_company_id)
            q = q.options(selectinload(ProductListing.product)).order_by(ProductListing.price.asc())
            res = await self.db.execute(q)
            candidates = [lst for lst in res.scalars().all() if self._listing_eligible(lst, _now())]
            if not candidates:
                return []
            lst = candidates[0]
            product = lst.product
            _, stock_units, _ = resolve_order_line(
                lst, product, oi.quantity, oi.sell_mode or "pack"
            )
            lines.append(
                {
                    "product_listing_id": lst.id,
                    "product_id": lst.product_id,
                    "product_name": product.name if product else oi.product_name,
                    "quantity": oi.quantity,
                    "sell_mode": oi.sell_mode or "pack",
                    "unit_price": float(lst.price),
                    "stock_units": stock_units,
                }
            )
        return lines

    async def _queue_partial_refund(
        self,
        order: Order,
        *,
        amount: float,
        reason: str,
        actor: User,
    ) -> None:
        from app.models.refund_request import RefundRequest

        if amount <= 0:
            return
        patient_user_id = await self._patient_user_id(order.patient_id)
        if not patient_user_id:
            return

        existing = await self.db.execute(
            select(RefundRequest).where(
                RefundRequest.order_id == order.id,
                RefundRequest.status == "pending",
            )
        )
        if existing.scalar_one_or_none():
            return

        refund = RefundRequest(
            order_id=order.id,
            patient_user_id=patient_user_id,
            amount=round(amount, 2),
            reason=reason,
            status="pending",
        )
        self.db.add(refund)
        await self.db.flush()

        await NotificationService(self.db).send(
            patient_user_id,
            title="Refund queued",
            message=(
                f"A refund of RWF {round(amount, 2):,.0f} for order "
                f"{order.order_code} is being processed."
            ),
            category="payment",
            action_url=f"/orders/{order.id}",
        )

    async def _adjust_stock_for_items(
        self, items: List[dict], *, sign: int
    ) -> None:
        """Atomically add ``sign * quantity`` to each listing's stock_quantity.

        ``sign=-1`` reserves stock (used on order create).
        ``sign=+1`` releases stock (used when an order is cancelled).
        Items without a product_listing_id (legacy free-form items) are skipped.
        """
        for it in items:
            listing_id = it.get("product_listing_id")
            stock_units = int(it.get("stock_units") or it.get("quantity") or 0)
            if not listing_id or stock_units <= 0:
                continue
            await self.db.execute(
                sa_update(ProductListing)
                .where(ProductListing.id == listing_id)
                .values(stock_quantity=ProductListing.stock_quantity + sign * stock_units)
            )
        await self.db.flush()

    async def _release_stock_for_order(self, order: Order) -> None:
        """Restore reserved stock for every item on a cancelled order."""
        res = await self.db.execute(
            select(OrderItem)
            .where(OrderItem.order_id == order.id)
            .options(
                selectinload(OrderItem.product_listing).selectinload(ProductListing.product)
            )
        )
        items: List[dict] = []
        for oi in res.scalars().all():
            if not oi.product_listing_id or not oi.product_listing:
                continue
            lst = oi.product_listing
            _, stock_units, _ = resolve_order_line(
                lst, lst.product, oi.quantity, oi.sell_mode or "pack"
            )
            items.append(
                {"product_listing_id": oi.product_listing_id, "stock_units": stock_units}
            )
        await self._adjust_stock_for_items(items, sign=+1)

    async def _queue_refund(self, order: Order, actor: User) -> None:
        from app.models.refund_request import RefundRequest

        patient_user_id = await self._patient_user_id(order.patient_id)
        if not patient_user_id:
            return

        existing = await self.db.execute(
            select(RefundRequest).where(
                RefundRequest.order_id == order.id,
                RefundRequest.status == "pending",
            )
        )
        if existing.scalar_one_or_none():
            return

        refund = RefundRequest(
            order_id=order.id,
            patient_user_id=patient_user_id,
            amount=float(order.total_amount or 0),
            reason=f"Order {order.order_code or order.id} cancelled",
            status="pending",
        )
        self.db.add(refund)
        await self.db.flush()

        notif = NotificationService(self.db)
        from app.core.constants import UserRole
        from app.models.user import User as UserModel

        finance_res = await self.db.execute(
            select(UserModel).where(
                UserModel.role.in_([UserRole.FINANCE_ADMIN, UserRole.SUPER_ADMIN])
            )
        )
        for fu in finance_res.scalars():
            await notif.send(
                user_id=fu.id,
                title="Refund required",
                message=(
                    f"Order {order.order_code or order.id[-8:]} was cancelled after payment. "
                    f"Refund {refund.amount:.0f} RWF to patient."
                ),
                category="payment",
            )
        if patient_user_id:
            await notif.send(
                user_id=patient_user_id,
                title="Refund processing",
                message=(
                    f"Your order was cancelled. A refund of {refund.amount:.0f} RWF "
                    "has been queued and will be processed within 3–5 business days."
                ),
                category="payment",
            )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.refund.queued",
            entity_type="RefundRequest",
            entity_id=refund.id,
            new_value={"order_id": order.id, "amount": refund.amount},
        )

    async def _assert_prescription_for_items(
        self,
        items: List[dict],
        prescription_id: Optional[str],
        patient_id: str,
    ) -> None:
        """If any item requires a prescription, ensure one is attached and valid."""
        product_ids = [it.get("product_id") for it in items if it.get("product_id")]
        if not product_ids:
            return

        res = await self.db.execute(
            select(ProductCatalogueItem.id, ProductCatalogueItem.name).where(
                ProductCatalogueItem.id.in_(product_ids),
                ProductCatalogueItem.prescription_required.is_(True),
            )
        )
        rx_required = list(res.all())
        if not rx_required:
            return

        if not prescription_id:
            names = ", ".join(name for _, name in rx_required)
            raise BusinessRuleError(
                f"Prescription required for: {names}"
            )

        rx_res = await self.db.execute(
            select(DigitalPrescription).where(
                DigitalPrescription.id == prescription_id
            )
        )
        rx = rx_res.scalar_one_or_none()
        if not rx:
            raise NotFoundError("Prescription", prescription_id)
        if rx.patient_id != patient_id:
            raise AuthorizationError("Prescription does not belong to this patient")
        if rx.status not in (
            PrescriptionStatus.REVIEWED,
            PrescriptionStatus.FULFILLED,
            PrescriptionStatus.PARTIALLY_FULFILLED,
        ):
            raise BusinessRuleError(
                "Prescription must be reviewed by a pharmacist before ordering"
            )
        if rx.valid_until:
            expires = rx.valid_until
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires <= _now():
                raise BusinessRuleError(
                    "This prescription has expired. Upload a new prescription or contact your pharmacist."
                )

