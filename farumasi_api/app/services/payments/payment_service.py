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
from app.services.payments.flutterwave_service import FlutterwaveService
from app.services.payments.momo_collection_service import normalize_rwanda_phone

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
    digits = re.sub(r"\D", "", raw.strip())
    if digits.startswith("250"):
        return "0" + digits[3:]
    if digits.startswith("0"):
        return digits
    if len(digits) == 9:
        return "0" + digits
    return raw.strip()


def _merchant_reference(order: Order) -> str:
    code = re.sub(r"[^A-Za-z0-9]", "", order.order_code or order.id[:12])
    ref = f"FAR{code}{uuid.uuid4().hex[:10]}"
    return ref[:50]


def _safe_payment_email(email: str, order_id: str) -> str:
    e = (email or "").strip()
    if "@" in e:
        domain = e.split("@", 1)[1].lower()
        if domain not in ("localhost",) and "." in domain and not domain.endswith(".local"):
            return e
    return f"patient.{order_id[:8]}@farumasi.rw"


def payment_processing_fee(amount: float) -> float:
    """Gateway fee passed to the patient (not absorbed by FARUMASI)."""
    pct = float(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)
    if pct <= 0 or amount <= 0:
        return 0.0
    return round(amount * pct / 100.0, 0)


def _flutterwave_user_message(exc: Exception) -> str:
    raw = str(exc).strip()
    if not raw:
        return "Could not start payment. Please try again."
    low = raw.lower()
    if "amount" in low and "limit" in low:
        return (
            "This order exceeds the current payment limit. Contact FARUMASI support "
            "or try a smaller order."
        )
    if "email" in low:
        return "Payment could not start: check your profile email and try again."
    if "phone" in low or "mobile" in low:
        return "Enter a valid Rwanda mobile number (e.g. 0781234567)."
    return f"Payment could not start: {raw[:220]}"


def _sanitize_callback_url(url: str, order_id: str) -> str:
    u = (url or "").strip()
    if u.startswith("https://") and "localhost" not in u and "127.0.0.1" not in u:
        return u
    base = _payment_return_base()
    if "localhost" in base or "127.0.0.1" in base:
        base = settings.API_PUBLIC_URL.rstrip("/")
    if base.endswith(".onrender.com") or "/api/" in base:
        return f"{base}/payment-return?order_id={order_id}"
    return f"{base}/cart?payment_return=1&order_id={order_id}"


def _payment_return_base() -> str:
    portal = (settings.PATIENT_PORTAL_URL or "").strip().rstrip("/")
    if portal and not portal.startswith("http://localhost") and "127.0.0.1" not in portal:
        return portal
    return settings.API_PUBLIC_URL.rstrip("/")


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.orders = OrderRepository(db)
        self.flutterwave = FlutterwaveService()

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

    async def initiate_flutterwave(
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

        default_name, default_email, actor_phone = await self._patient_contact(actor, order)
        customer_name = (name or default_name).strip() or default_name
        customer_email = _safe_payment_email(
            (email or default_email).strip() or default_email, order.id
        )

        phone_raw = (phone or actor_phone or "").strip()
        if not phone_raw:
            raise ValidationError("Enter your mobile number for payment.")
        try:
            msisdn = normalize_rwanda_phone(phone_raw)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        due = amount_due_for_order(order)
        processing_fee = payment_processing_fee(due)
        charge_amount = round(due + processing_fee, 0)

        if charge_amount <= 0:
            await self._mark_paid(order, reference=f"ZERO-{order.order_code}", method="none")
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PAID,
                amount=0,
                order_amount=0,
                processing_fee=0,
                provider="internal",
                message="No payment required for this order.",
                payment_method="none",
            )

        display_phone = _display_phone(phone_raw)
        merchant_ref = _merchant_reference(order)
        order.payment_method = "flutterwave"
        order.payment_phone = msisdn
        order.payment_status = PaymentStatus.PENDING

        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider="flutterwave",
            method="flutterwave",
            phone=msisdn,
            status=_TX_PENDING,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:{merchant_ref}",
        )
        self.db.add(txn)
        await self.db.flush()

        mode = (settings.PAYMENT_MODE or "sandbox").lower()
        if mode == "sandbox":
            await self._confirm_transaction(
                txn, order, provider_reference=f"SANDBOX-{merchant_ref[:16]}"
            )
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PAID,
                amount=charge_amount,
                order_amount=due,
                processing_fee=processing_fee,
                provider="flutterwave_sandbox",
                external_id=merchant_ref,
                message="Sandbox payment confirmed. Use live Flutterwave in production.",
                payment_method="flutterwave",
            )

        if not self.flutterwave.is_configured():
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = "Flutterwave not configured"
            await self.db.commit()
            raise BusinessRuleError(
                "Online payments are not configured. Contact FARUMASI support."
            )

        callback = _sanitize_callback_url(redirect_url or "", order.id)

        try:
            result = await self.flutterwave.initialize_payment(
                tx_ref=merchant_ref,
                amount=charge_amount,
                currency=settings.PAYMENT_CURRENCY,
                redirect_url=callback,
                customer_email=customer_email,
                customer_phone=display_phone,
                customer_name=customer_name,
                description=f"FARUMASI {order.order_code}",
            )
            if result.get("flw_ref"):
                txn.provider_reference = str(result["flw_ref"])
        except Exception as exc:
            logger.exception("Flutterwave initiate failed for order %s", order.id)
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(exc)[:500]
            patient_user_id = (
                await self.db.execute(
                    select(PatientProfile.user_id).where(
                        PatientProfile.id == order.patient_id
                    )
                )
            ).scalar_one_or_none()
            if patient_user_id:
                await NotificationService(self.db).payment_failed(
                    patient_user_id, order.id, order_code=order.order_code
                )
            await self.db.commit()
            raise BusinessRuleError(_flutterwave_user_message(exc)) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={
                "amount": charge_amount,
                "order_amount": due,
                "processing_fee": processing_fee,
                "provider": "flutterwave",
            },
        )
        await self.db.commit()
        fee_note = (
            f" Includes {int(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)}% payment processing fee."
            if processing_fee > 0
            else ""
        )
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=charge_amount,
            order_amount=due,
            processing_fee=processing_fee,
            provider="flutterwave",
            external_id=merchant_ref,
            checkout_url=result["link"],
            message=(
                f"Complete payment on Flutterwave (card or mobile money).{fee_note}"
            ),
            payment_method="flutterwave",
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)
        due = amount_due_for_order(order)
        fee = payment_processing_fee(due) if due > 0 else 0

        if order.payment_status == PaymentStatus.PENDING:
            txn = await self._latest_transaction(order.id)
            if txn and txn.status == _TX_PENDING and txn.provider == "flutterwave":
                if self.flutterwave.is_configured():
                    await self._sync_flutterwave_transaction(txn, order)

        return PaymentStatusOut(
            order_id=order.id,
            payment_status=order.payment_status,
            amount_due=due,
            amount_paid=float(order.total_amount) if order.payment_status == PaymentStatus.PAID else None,
            payment_method=order.payment_method,
            payment_reference=order.payment_reference,
            processing_fee=fee if order.payment_status != PaymentStatus.PAID else None,
            message=self._status_message(order.payment_status),
        )

    async def handle_flutterwave_webhook(self, body: dict, *, verif_hash: str) -> dict:
        if not FlutterwaveService.verify_webhook_hash(verif_hash):
            logger.warning("Flutterwave webhook rejected: invalid verif-hash")
            return {"status": "error", "message": "invalid signature"}

        event = str(body.get("event") or "")
        data = body.get("data") or {}
        if event != "charge.completed":
            return {"status": "ok", "message": "ignored"}

        tx_ref = str(data.get("tx_ref") or "")
        if not tx_ref:
            return {"status": "error", "message": "missing tx_ref"}

        txn = await self._find_transaction_by_ref(tx_ref)
        if not txn:
            logger.warning("Flutterwave webhook for unknown tx_ref=%s", tx_ref)
            return {"status": "error", "message": "unknown transaction"}

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            return {"status": "error", "message": "order not found"}

        try:
            if FlutterwaveService.is_payment_successful(data):
                flw_id = str(data.get("id") or "")
                await self._confirm_transaction(
                    txn,
                    order,
                    provider_reference=flw_id or tx_ref,
                )
            elif FlutterwaveService.is_payment_failed(data):
                order.payment_status = PaymentStatus.FAILED
                txn.status = _TX_FAILED
                txn.failure_reason = str(data.get("processor_response") or "failed")[:500]
            await self.db.commit()
        except Exception:
            logger.exception("Flutterwave webhook processing failed for %s", tx_ref)
            return {"status": "error", "message": "processing failed"}

        return {"status": "ok"}

    async def _find_transaction_by_ref(self, tx_ref: str) -> Optional[PaymentTransaction]:
        result = await self.db.execute(
            select(PaymentTransaction).where(PaymentTransaction.external_id == tx_ref)
        )
        return result.scalar_one_or_none()

    async def _sync_flutterwave_transaction(
        self,
        txn: PaymentTransaction,
        order: Order,
    ) -> None:
        ref = txn.external_id
        if not ref:
            return
        try:
            data = await self.flutterwave.verify_by_reference(ref)
        except Exception:
            logger.exception("Flutterwave status sync failed for %s", ref)
            return
        if not data:
            return
        if FlutterwaveService.is_payment_successful(data):
            flw_id = str(data.get("id") or ref)
            await self._confirm_transaction(txn, order, provider_reference=flw_id)
            await self.db.commit()
        elif FlutterwaveService.is_payment_failed(data):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(data.get("processor_response") or "failed")[:500]
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
        from datetime import timedelta

        from app.core.constants import PARTNER_RESPONSE_TIMEOUT_MINUTES

        order.payment_status = PaymentStatus.PAID
        order.payment_reference = reference
        if method != "none":
            order.payment_method = method
        order.amount_paid_snapshot = float(order.total_amount or 0)
        order.partner_response_due_at = datetime.now(timezone.utc) + timedelta(
            minutes=PARTNER_RESPONSE_TIMEOUT_MINUTES
        )
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
            return "Waiting for payment on Flutterwave."
        if status == PaymentStatus.FAILED:
            return "Payment failed. You can try again."
        return "Payment not started yet."
