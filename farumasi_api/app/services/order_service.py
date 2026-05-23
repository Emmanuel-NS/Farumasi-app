from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.constants import (
    DeliveryMethod,
    EntityStatus,
    ListingAvailability,
    OrderStatus,
    PaymentStatus,
    ProductApprovalStatus,
    RevenueStatus,
    UserRole,
)
from app.core.exceptions import (
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.partner import PartnerCompany
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.models.prescription import DigitalPrescription, PrescriptionItem
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.recommendation import PharmacyRecommendation
from app.models.revenue import RevenueRecord
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.schemas.order import (
    OrderCreate,
    OrderItemCreate,
    OrderStatusUpdate,
    PaymentStatusUpdate,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


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


def _generate_order_code() -> str:
    return f"FAR-{uuid.uuid4().hex[:8].upper()}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


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

        subtotal = sum(it["unit_price"] * it["quantity"] for it in items)
        delivery_fee = 0.0
        if data.delivery_method == DeliveryMethod.DELIVERY:
            delivery_fee = 0.0 if subtotal >= 10_000 else 1_500.0

        commission = round(subtotal * settings.PLATFORM_COMMISSION_RATE, 2)
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
                    unit_price=it["unit_price"],
                    total_price=round(it["unit_price"] * it["quantity"], 2),
                )
            )
        await self.db.flush()

        # Pre-existing behavior (kept untouched in Phase 6): if delivery method,
        # create a Delivery row so downstream phases can attach a rider.
        if data.delivery_method == DeliveryMethod.DELIVERY:
            self.db.add(
                Delivery(
                    order_id=order.id,
                    destination_address=data.delivery_address,
                    destination_latitude=data.delivery_latitude,
                    destination_longitude=data.delivery_longitude,
                    delivery_fee=delivery_fee,
                )
            )
            await self.db.flush()

        # Notify pharmacy/partner owner
        notif = NotificationService(self.db)
        owner_user_id = await self._owner_user_id(pharmacy_id, partner_id)
        if owner_user_id:
            await notif.order_placed(owner_user_id, order.order_code)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.created",
            entity_type="Order",
            entity_id=order.id,
            new_value={"order_code": order.order_code, "total": float(order.total_amount)},
        )

        return await self._reload(order.id)

    async def get_order(self, order_id: str, actor: User) -> Order:
        order = await self._reload(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        await self._assert_can_view(order, actor)
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
    ) -> Tuple[List[Order], int]:
        pharmacy = await self._get_owned_pharmacy(actor)
        if not pharmacy:
            raise NotFoundError("Pharmacy")
        conds = [Order.pharmacy_id == pharmacy.id]
        if status:
            conds.append(Order.order_status == status)
        return await self._paginate(*conds, offset=offset, limit=limit)

    async def list_partner_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
    ) -> Tuple[List[Order], int]:
        partner = await self._get_owned_partner(actor)
        if not partner:
            raise NotFoundError("Partner company")
        conds = [Order.partner_company_id == partner.id]
        if status:
            conds.append(Order.order_status == status)
        return await self._paginate(*conds, offset=offset, limit=limit)

    async def list_all_orders(
        self,
        actor: User,
        *,
        offset: int,
        limit: int,
        status: Optional[str] = None,
    ) -> Tuple[List[Order], int]:
        """Role-scoped list. Used by ``GET /api/v1/orders``."""
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            conds = []
            if status:
                conds.append(Order.order_status == status)
            return await self._paginate(*conds, offset=offset, limit=limit)
        if role == UserRole.PATIENT:
            return await self.list_patient_orders(actor, offset=offset, limit=limit)
        if role == UserRole.PHARMACY_ADMIN:
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

        old_status = order.order_status
        order.order_status = data.order_status

        if data.order_status == OrderStatus.COMPLETED:
            await self._create_revenue(order)

        await self.db.flush()

        notif = NotificationService(self.db)
        patient_user_id = await self._patient_user_id(order.patient_id)
        if patient_user_id:
            await notif.order_status_changed(
                patient_user_id, order.order_code, data.order_status
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

        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="order.payment_changed",
            entity_type="Order",
            entity_id=order.id,
            new_value={"payment_status": data.payment_status},
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
            items.append(
                {
                    "product_listing_id": lst.id,
                    "product_id": lst.product_id,
                    "product_name": lst.product.name if lst.product else rx_item.medicine_name,
                    "quantity": qty,
                    "unit_price": float(lst.price),
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
                if lst.availability_status != ListingAvailability.AVAILABLE:
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
                if lst.stock_quantity < raw.quantity:
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
                        "unit_price": float(lst.price),
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

        return items, pharmacy_id, partner_id

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
        if role == UserRole.PHARMACY_ADMIN:
            if order.pharmacy_id and await self._owns_pharmacy(actor, order.pharmacy_id):
                return
            raise AuthorizationError("Not allowed to view this order")
        if role == UserRole.PARTNER_COMPANY_ADMIN:
            if order.partner_company_id and await self._owns_partner(
                actor, order.partner_company_id
            ):
                return
            raise AuthorizationError("Not allowed to view this order")
        if role == UserRole.PHARMACIST:
            # Pharmacists can view order context tied to a prescription review.
            # Keep permissive — they cannot manage status, only read.
            return
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
            if owns and new_status == OrderStatus.CANCELLED and order.order_status == OrderStatus.PENDING:
                return
            raise AuthorizationError(
                "Patients may only cancel their own pending orders"
            )
        if role == UserRole.PHARMACY_ADMIN:
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

    async def _assert_can_update_payment(self, order: Order, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN:
            return
        if role == UserRole.PATIENT:
            patient = await self._get_patient_for_user(actor)
            if patient and patient.id == order.patient_id:
                return
        raise AuthorizationError("Not allowed to update payment status")

    # ── Helpers ───────────────────────────────────────────────────────────

    async def _get_patient_for_user(self, actor: User) -> Optional[PatientProfile]:
        res = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        return res.scalar_one_or_none()

    async def _get_owned_pharmacy(self, actor: User) -> Optional[Pharmacy]:
        res = await self.db.execute(
            select(Pharmacy).where(Pharmacy.owner_user_id == actor.id)
        )
        return res.scalar_one_or_none()

    async def _get_owned_partner(self, actor: User) -> Optional[PartnerCompany]:
        res = await self.db.execute(
            select(PartnerCompany).where(PartnerCompany.owner_user_id == actor.id)
        )
        return res.scalar_one_or_none()

    async def _owns_pharmacy(self, actor: User, pharmacy_id: str) -> bool:
        res = await self.db.execute(
            select(Pharmacy.id).where(
                Pharmacy.id == pharmacy_id, Pharmacy.owner_user_id == actor.id
            )
        )
        return res.scalar_one_or_none() is not None

    async def _owns_partner(self, actor: User, partner_id: str) -> bool:
        res = await self.db.execute(
            select(PartnerCompany.id).where(
                PartnerCompany.id == partner_id,
                PartnerCompany.owner_user_id == actor.id,
            )
        )
        return res.scalar_one_or_none() is not None

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

    async def _reload(self, order_id: str) -> Optional[Order]:
        res = await self.db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(selectinload(Order.items))
        )
        return res.scalar_one_or_none()

    async def _paginate(
        self, *conds, offset: int, limit: int
    ) -> Tuple[List[Order], int]:
        count_q = select(func.count(Order.id))
        if conds:
            count_q = count_q.where(*conds)
        total = (await self.db.execute(count_q)).scalar_one()

        q = select(Order).options(selectinload(Order.items))
        if conds:
            q = q.where(*conds)
        q = q.order_by(Order.created_at.desc()).offset(offset).limit(limit)
        res = await self.db.execute(q)
        return list(res.scalars().all()), int(total)

    async def _create_revenue(self, order: Order) -> None:
        """Create a revenue record when order is completed.

        Pre-existing Phase 8 placeholder behavior — kept so existing
        revenue tests continue to pass. Not exercised by Phase 6 flow.
        """
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
