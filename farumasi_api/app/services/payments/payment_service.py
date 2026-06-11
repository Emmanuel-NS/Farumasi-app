from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import PaymentStatus, UserRole
from app.core.exceptions import AuthorizationError, BusinessRuleError, NotFoundError, ValidationError
from app.models.order import Order
from app.models.patient import PatientProfile
from app.models.payment_transaction import PaymentTransaction
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.schemas.payment import PaymentInitiateOut, PaymentStatusOut
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.payments.momo_collection_service import normalize_rwanda_phone
from app.services.payments.pesapal_service import PesapalService

logger = logging.getLogger(__name__)

_TX_SUCCESS = "successful"
_TX_PENDING = "pending"
_TX_FAILED = "failed"


def amount_due_for_order(order: Order) -> float:
    """Whole RWF due at checkout (may exclude deferred delivery fee)."""
    total = float(order.total_amount)
    if order.defer_delivery_fee and float(order.delivery_fee) > 0:
        return round(total - float(order.delivery_fee), 2)
    return round(total, 2)


def _display_phone(raw: str) -> str:
    """Normalize to local 07… format for Pesapal billing."""
    digits = re.sub(r"\D", "", raw.strip())
    if digits.startswith("250"):
        return "0" + digits[3:]
    if digits.startswith("0"):
        return digits
    if len(digits) == 9:
        return "0" + digits
    return raw.strip()


def _split_name(full_name: str) -> tuple[str, str]:
    parts = full_name.strip().split(None, 1)
    if not parts:
        return "FARUMASI", "Patient"
    if len(parts) == 1:
        return parts[0], "Patient"
    return parts[0], parts[1]


def _merchant_reference(order: Order) -> str:
    """Pesapal id: alphanumeric, dash, underscore, dot, colon — max 50 chars."""
    ref = f"FAR-{order.order_code}-{uuid.uuid4().hex[:8]}"
    return ref[:50]


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.orders = OrderRepository(db)
        self.pesapal = PesapalService()

    async def _get_patient_order(self, order_id: str, actor: User) -> Order:
        order = await self.orders.get_by_id(order_id)
        if not order:
            raise NotFoundError("Order", order_id)
        if actor.role != UserRole.PATIENT:
            raise AuthorizationError("Only the patient can pay for this order")
        patient = (
            await self.db.execute(
                select(PatientProfile).where(PatientProfile.user_id == actor.id)
            )
        ).scalar_one_or_none()
        if not patient or patient.id != order.patient_id:
            raise AuthorizationError("You cannot pay for this order")
        return order

    async def _patient_contact(self, actor: User, order: Order) -> tuple[str, str, str]:
        name = actor.full_name or "FARUMASI Patient"
        email = actor.email or f"patient+{order.id[:8]}@farumasi.local"
        phone = actor.phone or order.payment_phone or ""
        return name, email, phone

    async def initiate_pesapal(
        self,
        order_id: str,
        actor: User,
        *,
        phone: str,
        email: Optional[str] = None,
        name: Optional[str] = None,
        redirect_url: Optional[str] = None,
    ) -> PaymentInitiateOut:
        order = await self._get_patient_order(order_id, actor)
        if order.payment_status == PaymentStatus.PAID:
            raise BusinessRuleError("This order is already paid")

        try:
            msisdn = normalize_rwanda_phone(phone)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        due = amount_due_for_order(order)
        if due <= 0:
            await self._mark_paid(order, reference=f"ZERO-{order.order_code}", method="none")
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PAID,
                amount=0,
                provider="internal",
                message="No payment required for this order.",
            )

        default_name, default_email, _ = await self._patient_contact(actor, order)
        customer_name = (name or default_name).strip() or default_name
        customer_email = (email or default_email).strip() or default_email
        display_phone = _display_phone(phone)
        first_name, last_name = _split_name(customer_name)

        merchant_ref = _merchant_reference(order)
        order.payment_method = "pesapal"
        order.payment_phone = msisdn
        order.payment_status = PaymentStatus.PENDING

        txn = PaymentTransaction(
            order_id=order.id,
            amount=due,
            currency=settings.PAYMENT_CURRENCY,
            provider="pesapal",
            method="pesapal",
            phone=msisdn,
            status=_TX_PENDING,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:{merchant_ref}",
        )
        self.db.add(txn)
        await self.db.flush()

        mode = (settings.PAYMENT_MODE or "sandbox").lower()
        if mode == "sandbox":
            await self._confirm_transaction(txn, order, provider_reference=f"SANDBOX-{merchant_ref[:16]}")
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PAID,
                amount=due,
                provider="pesapal_sandbox",
                external_id=merchant_ref,
                message="Sandbox payment confirmed. Use Pesapal checkout in production.",
            )

        if not self.pesapal.is_configured():
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = "Pesapal not configured"
            await self.db.commit()
            raise BusinessRuleError(
                "Online payments are not configured. Contact FARUMASI support."
            )

        callback = redirect_url or (
            f"{settings.PATIENT_PORTAL_URL.rstrip('/')}/cart?payment_return=1&order_id={order.id}"
        )

        try:
            result = await self.pesapal.submit_order(
                merchant_reference=merchant_ref,
                amount=due,
                currency=settings.PAYMENT_CURRENCY,
                description=f"FARUMASI order {order.order_code}",
                callback_url=callback,
                email=customer_email,
                phone=display_phone,
                first_name=first_name,
                last_name=last_name,
            )
            txn.provider_reference = result.get("order_tracking_id") or None
        except Exception as exc:
            logger.exception("Pesapal initiate failed for order %s", order.id)
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(exc)[:500]
            patient_user_id = (
                await self.db.execute(
                    select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
                )
            ).scalar_one_or_none()
            if patient_user_id:
                await NotificationService(self.db).payment_failed(
                    patient_user_id, order.id, order_code=order.order_code
                )
            await self.db.commit()
            raise BusinessRuleError(
                "Could not start payment. Please try again or use another method."
            ) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={"amount": due, "provider": "pesapal"},
        )
        await self.db.commit()
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=due,
            provider="pesapal",
            external_id=merchant_ref,
            checkout_url=result["redirect_url"],
            message="Complete payment on the secure Pesapal checkout page.",
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)
        due = amount_due_for_order(order)

        if order.payment_status == PaymentStatus.PENDING and self.pesapal.is_configured():
            txn = await self._latest_transaction(order.id)
            if txn and txn.status == _TX_PENDING and txn.provider == "pesapal":
                await self._sync_pesapal_transaction(txn, order)

        return PaymentStatusOut(
            order_id=order.id,
            payment_status=order.payment_status,
            amount_due=due,
            amount_paid=float(order.total_amount) if order.payment_status == PaymentStatus.PAID else None,
            payment_method=order.payment_method,
            payment_reference=order.payment_reference,
            message=self._status_message(order.payment_status),
        )

    async def handle_pesapal_ipn(
        self,
        *,
        order_tracking_id: str,
        merchant_reference: str,
    ) -> dict:
        """Process IPN/callback; returns Pesapal acknowledgment payload."""
        txn = await self._find_pesapal_transaction(order_tracking_id, merchant_reference)
        ack = {
            "orderNotificationType": "IPNCHANGE",
            "orderTrackingId": order_tracking_id,
            "orderMerchantReference": merchant_reference,
            "status": 500,
        }
        if not txn:
            logger.warning(
                "Pesapal IPN for unknown txn tracking=%s ref=%s",
                order_tracking_id,
                merchant_reference,
            )
            return ack

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            return ack

        try:
            if order_tracking_id and not txn.provider_reference:
                txn.provider_reference = order_tracking_id
            await self._sync_pesapal_transaction(txn, order, tracking_id=order_tracking_id)
            ack["status"] = 200
        except Exception:
            logger.exception("Pesapal IPN processing failed for %s", order_tracking_id)
        return ack

    async def _find_pesapal_transaction(
        self, order_tracking_id: str, merchant_reference: str
    ) -> Optional[PaymentTransaction]:
        if merchant_reference:
            result = await self.db.execute(
                select(PaymentTransaction).where(PaymentTransaction.external_id == merchant_reference)
            )
            txn = result.scalar_one_or_none()
            if txn:
                return txn
        if order_tracking_id:
            result = await self.db.execute(
                select(PaymentTransaction).where(
                    PaymentTransaction.provider_reference == order_tracking_id
                )
            )
            return result.scalar_one_or_none()
        return None

    async def _sync_pesapal_transaction(
        self,
        txn: PaymentTransaction,
        order: Order,
        *,
        tracking_id: Optional[str] = None,
    ) -> None:
        tid = tracking_id or txn.provider_reference
        if not tid:
            return
        try:
            data = await self.pesapal.get_transaction_status(tid)
        except Exception:
            logger.exception("Pesapal status sync failed for %s", tid)
            return
        if not data:
            return

        if PesapalService.is_payment_completed(data):
            ref = str(data.get("confirmation_code") or tid)
            await self._confirm_transaction(txn, order, provider_reference=ref)
            await self.db.commit()
        elif PesapalService.is_payment_failed(data):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = data.get("payment_status_description") or "failed"
            await self.db.commit()

    async def _latest_transaction(self, order_id: str) -> Optional[PaymentTransaction]:
        result = await self.db.execute(
            select(PaymentTransaction)
            .where(PaymentTransaction.order_id == order_id)
            .order_by(PaymentTransaction.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _confirm_transaction(
        self,
        txn: PaymentTransaction,
        order: Order,
        *,
        provider_reference: str,
    ) -> None:
        if txn.status == _TX_SUCCESS:
            return
        txn.status = _TX_SUCCESS
        txn.provider_reference = txn.provider_reference or provider_reference
        txn.paid_at = datetime.now(timezone.utc)
        await self._mark_paid(order, reference=provider_reference, method=txn.method)

    async def _mark_paid(self, order: Order, *, reference: str, method: str) -> None:
        order.payment_status = PaymentStatus.PAID
        order.payment_reference = reference
        if method != "none":
            order.payment_method = method
        await self.db.flush()

        patient_user_id = (
            await self.db.execute(
                select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        if patient_user_id:
            await NotificationService(self.db).send(
                patient_user_id,
                title="Payment confirmed",
                message=f"Your payment for order {order.order_code} was successful.",
                category="order",
                action_url=f"/orders/{order.id}",
            )

    @staticmethod
    def _status_message(status: str) -> str:
        if status == PaymentStatus.PAID:
            return "Payment confirmed."
        if status == PaymentStatus.PENDING:
            return "Waiting for payment on Pesapal checkout."
        if status == PaymentStatus.FAILED:
            return "Payment failed. You can try again."
        return "Payment not started yet."
