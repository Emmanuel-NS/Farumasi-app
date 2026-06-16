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
from app.services.payments.momo_collection_service import MomoCollectionService, normalize_rwanda_phone
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
    code = re.sub(r"[^A-Za-z0-9]", "", order.order_code or order.id[:12])
    ref = f"FAR{code}{uuid.uuid4().hex[:10]}"
    return ref[:50]


def _safe_payment_email(email: str, order_id: str) -> str:
    """Pesapal rejects invalid domains (e.g. .local)."""
    e = (email or "").strip()
    if "@" in e:
        domain = e.split("@", 1)[1].lower()
        if domain not in ("localhost",) and "." in domain and not domain.endswith(".local"):
            return e
    return f"patient.{order_id[:8]}@farumasi.rw"


def _payment_processing_fee(amount: float) -> float:
    pct = float(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)
    if pct <= 0 or amount <= 0:
        return 0.0
    return round(amount * pct / 100.0, 0)


def _pesapal_user_message(exc: Exception) -> str:
    raw = str(exc).strip()
    if not raw:
        return "Could not start payment. Please try again or use another method."

    parsed: dict | None = None
    if raw.startswith("{"):
        import ast
        import json

        try:
            maybe = ast.literal_eval(raw)
            if isinstance(maybe, dict):
                parsed = maybe
        except (SyntaxError, ValueError):
            try:
                maybe = json.loads(raw.replace("'", '"'))
                if isinstance(maybe, dict):
                    parsed = maybe
            except (json.JSONDecodeError, ValueError):
                parsed = None

    if parsed:
        code = str(parsed.get("code") or "").lower()
        message = parsed.get("message")
        if code == "amount_exceeds_default_limit":
            return (
                "This order exceeds the current Pesapal transaction limit on the FARUMASI "
                "merchant account. Please contact support — we are working with Pesapal to "
                "raise the limit. For testing, try a smaller order."
            )
        if isinstance(message, str) and message.strip():
            return f"Payment could not start: {message.strip()}"

    low = raw.lower()
    if "amount_exceeds" in low or "exceeds limit" in low:
        return (
            "This order exceeds the current payment limit. Contact FARUMASI support or "
            "try a smaller order while limits are being raised with Pesapal."
        )
    if "email" in low:
        return "Payment could not start: check your profile email or try another method."
    if "notification" in low or "ipn" in low:
        return "Payment service is not fully configured. Contact FARUMASI support."
    if "callback" in low:
        return "Payment return link is invalid. Try again from the app."
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
        self.pesapal = PesapalService()
        self.momo = MomoCollectionService()

    @staticmethod
    def _default_payment_return_url(order_id: str) -> str:
        base = _payment_return_base()
        if "localhost" in base or "127.0.0.1" in base:
            base = settings.API_PUBLIC_URL.rstrip("/")
        if base.endswith(".onrender.com") or "/api/" in base:
            return f"{base}/payment-return?order_id={order_id}"
        return f"{base}/cart?payment_return=1&order_id={order_id}"

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
        payment_method: str = "mtn_momo",
    ) -> PaymentInitiateOut:
        order = await self._get_patient_order(order_id, actor)
        if order.payment_status == PaymentStatus.PAID:
            raise BusinessRuleError("This order is already paid")

        method = (payment_method or "mtn_momo").lower().strip()
        if method not in ("mtn_momo", "airtel_money", "card"):
            raise ValidationError("Invalid payment method. Choose MTN MoMo, Airtel Money, or card.")

        default_name, default_email, actor_phone = await self._patient_contact(actor, order)
        customer_name = (name or default_name).strip() or default_name
        customer_email = _safe_payment_email((email or default_email).strip() or default_email, order.id)

        phone_raw = (phone or actor_phone or "").strip()
        if method in ("mtn_momo", "airtel_money"):
            if not phone_raw:
                raise ValidationError("Enter your mobile money number for this payment method.")
            try:
                msisdn = normalize_rwanda_phone(phone_raw)
            except ValueError as exc:
                raise ValidationError(str(exc)) from exc
        else:
            try:
                msisdn = normalize_rwanda_phone(phone_raw) if phone_raw else normalize_rwanda_phone(actor_phone or "0780000000")
            except ValueError:
                msisdn = "250788000000"

        due = amount_due_for_order(order)
        processing_fee = _payment_processing_fee(due)
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
                payment_method=method,
            )

        display_phone = _display_phone(phone_raw or actor_phone or "0780000000")
        first_name, last_name = _split_name(customer_name)

        merchant_ref = _merchant_reference(order)
        order.payment_method = method
        order.payment_phone = msisdn
        order.payment_status = PaymentStatus.PENDING

        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider="pesapal",
            method=method,
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
                amount=charge_amount,
                order_amount=due,
                processing_fee=processing_fee,
                provider="pesapal_sandbox",
                external_id=merchant_ref,
                message="Sandbox payment confirmed. Use live payments in production.",
                payment_method=method,
            )

        # MTN MoMo direct — prompts on the customer's phone (no Pesapal card form).
        if method == "mtn_momo" and self.momo.is_configured():
            txn.provider = "mtn_momo"
            try:
                await self.momo.request_to_pay(
                    reference_id=merchant_ref,
                    amount=charge_amount,
                    phone=msisdn,
                    payer_message=f"FARUMASI {order.order_code}"[:160],
                )
            except Exception as exc:
                logger.exception("MTN MoMo initiate failed for order %s", order.id)
                order.payment_status = PaymentStatus.FAILED
                txn.status = _TX_FAILED
                txn.failure_reason = str(exc)[:500]
                await self.db.commit()
                raise BusinessRuleError(
                    "Could not send MTN MoMo payment request. Check your number and try again."
                ) from exc

            await AuditService(self.db).log(
                actor_user_id=actor.id,
                action="payment.initiated",
                entity_type="Order",
                entity_id=order.id,
                new_value={
                    "amount": charge_amount,
                    "order_amount": due,
                    "processing_fee": processing_fee,
                    "provider": "mtn_momo",
                    "method": method,
                },
            )
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PENDING,
                amount=charge_amount,
                order_amount=due,
                processing_fee=processing_fee,
                provider="mtn_momo",
                external_id=merchant_ref,
                message=(
                    f"Check your phone ({display_phone}) and approve the MTN MoMo payment. "
                    "You may need to enter your MoMo PIN."
                ),
                payment_method=method,
            )

        if not self.pesapal.is_configured():
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = "Pesapal not configured"
            await self.db.commit()
            raise BusinessRuleError(
                "Online payments are not configured. Contact FARUMASI support."
            )

        callback = _sanitize_callback_url(redirect_url or "", order.id)

        method_hint = {
            "mtn_momo": "MTN MoMo",
            "airtel_money": "Airtel Money",
            "card": "Card",
        }.get(method, "Pesapal")

        try:
            result = await self.pesapal.submit_order(
                merchant_reference=merchant_ref,
                amount=charge_amount,
                currency=settings.PAYMENT_CURRENCY,
                description=f"FARUMASI {order.order_code} ({method_hint})"[:100],
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
            raise BusinessRuleError(_pesapal_user_message(exc)) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={
                "amount": charge_amount,
                "order_amount": due,
                "processing_fee": processing_fee,
                "provider": "pesapal",
                "method": method,
            },
        )
        await self.db.commit()
        pesapal_messages = {
            "mtn_momo": (
                "On the Pesapal page, tap MTN Mobile Money — do not use Card unless you intend to pay by card."
            ),
            "airtel_money": "On the Pesapal page, select Airtel Money as your payment method.",
            "card": "Complete your card payment on the secure Pesapal page.",
        }
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=charge_amount,
            order_amount=due,
            processing_fee=processing_fee,
            provider="pesapal",
            external_id=merchant_ref,
            checkout_url=result["redirect_url"],
            message=pesapal_messages.get(method, f"Complete {method_hint} payment on Pesapal."),
            payment_method=method,
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)
        due = amount_due_for_order(order)

        if order.payment_status == PaymentStatus.PENDING:
            txn = await self._latest_transaction(order.id)
            if txn and txn.status == _TX_PENDING:
                if txn.provider == "mtn_momo":
                    await self._sync_momo_transaction(txn, order)
                elif txn.provider == "pesapal" and self.pesapal.is_configured():
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

    async def _sync_momo_transaction(
        self,
        txn: PaymentTransaction,
        order: Order,
    ) -> None:
        ref = txn.external_id
        if not ref:
            return
        try:
            status = await self.momo.get_status(ref)
        except Exception:
            logger.exception("MTN MoMo status sync failed for %s", ref)
            return
        if not status:
            return
        normalized = status.upper()
        if normalized == "SUCCESSFUL":
            await self._confirm_transaction(txn, order, provider_reference=ref)
            await self.db.commit()
        elif normalized in ("FAILED", "TIMEOUT", "REJECTED"):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = normalized.lower()
            await self.db.commit()

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
