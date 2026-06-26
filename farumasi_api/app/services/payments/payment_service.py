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
from app.services.payments.mtn_madapi_service import MtnMadapiService
from app.services.payments.pesapal_service import PesapalService

logger = logging.getLogger(__name__)

_TX_SUCCESS = "successful"
_TX_PENDING = "pending"
_TX_FAILED = "failed"


def amount_due_for_order(order: Order) -> float:
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
    pct = float(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)
    if pct <= 0 or amount <= 0:
        return 0.0
    return round(amount * pct / 100.0, 0)


def _mtn_madapi_needs_fallback(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        x in text
        for x in ("401", "4000", "unauthorised", "unauthorized", "verify token and environment")
    )


def _payment_user_message(exc: Exception) -> str:
    raw = str(exc).strip()
    if not raw:
        return "Could not start payment. Please try again."
    low = raw.lower()
    if _mtn_madapi_needs_fallback(exc):
        return (
            "MTN MoMo direct payment is not active on your merchant account yet. "
            "Try card payment, or contact FARUMASI support."
        )
    if "amount" in low and "limit" in low:
        return "This order exceeds the current payment limit. Contact FARUMASI support."
    if "phone" in low or "msisdn" in low or "mobile" in low:
        return "Enter a valid Rwanda MTN number (e.g. 0781234567)."
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


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "FARUMASI Patient").strip().split(None, 1)
    if len(parts) == 1:
        return parts[0], "Patient"
    return parts[0], parts[1]


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.orders = OrderRepository(db)
        self.mtn = MtnMadapiService()
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

    async def initiate_payment(
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

        default_name, default_email, actor_phone = await self._patient_contact(actor, order)
        customer_name = (name or default_name).strip() or default_name
        customer_email = _safe_payment_email(
            (email or default_email).strip() or default_email, order.id
        )

        method = (payment_method or "mtn_momo").lower().strip()
        if method not in ("mtn_momo", "card"):
            raise ValidationError("Choose MTN MoMo or card.")

        phone_raw = (phone or actor_phone or "").strip()
        if method == "mtn_momo":
            if not phone_raw:
                raise ValidationError("Enter your MTN MoMo number for this payment.")
            try:
                msisdn = normalize_rwanda_phone(phone_raw)
            except ValueError as exc:
                raise ValidationError(str(exc)) from exc
        else:
            msisdn = ""
            try:
                if phone_raw:
                    msisdn = normalize_rwanda_phone(phone_raw)
            except ValueError:
                msisdn = ""

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

        merchant_ref = _merchant_reference(order)
        order.payment_method = method
        order.payment_phone = msisdn or phone_raw or None
        order.payment_status = PaymentStatus.PENDING

        mode = (settings.PAYMENT_MODE or "sandbox").lower()
        if mode == "sandbox":
            provider = "mtn_madapi_sandbox" if method == "mtn_momo" else "pesapal_sandbox"
            txn = PaymentTransaction(
                order_id=order.id,
                amount=charge_amount,
                currency=settings.PAYMENT_CURRENCY,
                provider=provider,
                method=method,
                phone=msisdn or phone_raw or None,
                status=_TX_PENDING,
                external_id=merchant_ref,
                idempotency_key=f"{order.id}:{merchant_ref}",
            )
            self.db.add(txn)
            await self.db.flush()
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
                provider=provider,
                external_id=merchant_ref,
                message="Sandbox payment confirmed.",
                payment_method=method,
            )

        if method == "mtn_momo":
            return await self._initiate_mtn_momo(
                order,
                actor,
                merchant_ref=merchant_ref,
                msisdn=msisdn,
                customer_name=customer_name,
                customer_email=customer_email,
                phone_raw=phone_raw or actor_phone,
                redirect_url=redirect_url,
                due=due,
                charge_amount=charge_amount,
                processing_fee=processing_fee,
            )
        return await self._initiate_pesapal_checkout(
            order,
            actor,
            merchant_ref=merchant_ref,
            customer_name=customer_name,
            customer_email=customer_email,
            phone_raw=phone_raw or actor_phone,
            redirect_url=redirect_url,
            due=due,
            charge_amount=charge_amount,
            processing_fee=processing_fee,
        )

    async def initiate_flutterwave(self, *args, **kwargs) -> PaymentInitiateOut:
        """Backward-compatible alias — routes to MTN MADAPI / Pesapal."""
        return await self.initiate_payment(*args, **kwargs)

    async def _initiate_mtn_momo(
        self,
        order: Order,
        actor: User,
        *,
        merchant_ref: str,
        msisdn: str,
        customer_name: str,
        customer_email: str,
        phone_raw: str,
        redirect_url: Optional[str],
        due: float,
        charge_amount: float,
        processing_fee: float,
    ) -> PaymentInitiateOut:
        if not self.mtn.is_configured():
            order.payment_status = PaymentStatus.FAILED
            await self.db.commit()
            raise BusinessRuleError(
                "MTN MoMo payments are not configured. Contact FARUMASI support."
            )

        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider="mtn_madapi",
            method="mtn_momo",
            phone=msisdn,
            status=_TX_PENDING,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:{merchant_ref}",
        )
        self.db.add(txn)
        await self.db.flush()

        try:
            result = await self.mtn.request_momo_payment(
                transaction_id=merchant_ref,
                amount=charge_amount,
                currency=settings.PAYMENT_CURRENCY,
                msisdn=msisdn,
                payer_name=customer_name,
                description=f"FARUMASI {order.order_code}",
            )
            txn.provider_reference = result.get("provider_transaction_id") or merchant_ref
        except Exception as exc:
            logger.exception("MTN MADAPI initiate failed for order %s", order.id)
            txn.status = _TX_FAILED
            txn.failure_reason = str(exc)[:500]
            await self.db.flush()
            if _mtn_madapi_needs_fallback(exc) and self.pesapal.is_configured():
                logger.warning(
                    "MTN MADAPI not authorised for collections — using Pesapal MoMo for order %s",
                    order.id,
                )
                order.payment_status = PaymentStatus.PENDING
                return await self._initiate_pesapal_checkout(
                    order,
                    actor,
                    merchant_ref=_merchant_reference(order),
                    customer_name=customer_name,
                    customer_email=customer_email,
                    phone_raw=phone_raw or msisdn,
                    redirect_url=redirect_url,
                    due=due,
                    charge_amount=charge_amount,
                    processing_fee=processing_fee,
                    payment_method="mtn_momo",
                    provider="pesapal_momo",
                    checkout_message=(
                        "Complete your MTN MoMo payment on the secure Pesapal page."
                    ),
                )
            order.payment_status = PaymentStatus.FAILED
            await self._notify_payment_failed(order)
            await self.db.commit()
            raise BusinessRuleError(_payment_user_message(exc)) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={
                "amount": charge_amount,
                "provider": "mtn_madapi",
                "method": "mtn_momo",
            },
        )
        await self.db.commit()

        fee_note = (
            f" Includes {int(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)}% processing fee."
            if processing_fee > 0
            else ""
        )
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=charge_amount,
            order_amount=due,
            processing_fee=processing_fee,
            provider="mtn_madapi",
            external_id=merchant_ref,
            message=(
                f"Check your phone — approve the MTN MoMo prompt for RWF {int(charge_amount):,}.{fee_note}"
            ),
            payment_method="mtn_momo",
        )

    async def _initiate_pesapal_checkout(
        self,
        order: Order,
        actor: User,
        *,
        merchant_ref: str,
        customer_name: str,
        customer_email: str,
        phone_raw: str,
        redirect_url: Optional[str],
        due: float,
        charge_amount: float,
        processing_fee: float,
        payment_method: str = "card",
        provider: str = "pesapal",
        checkout_message: Optional[str] = None,
    ) -> PaymentInitiateOut:
        if not self.pesapal.is_configured():
            order.payment_status = PaymentStatus.FAILED
            await self.db.commit()
            label = "Card" if payment_method == "card" else "MoMo"
            raise BusinessRuleError(
                f"{label} payments are not configured. Contact FARUMASI support."
            )

        first, last = _split_name(customer_name)
        callback = _sanitize_callback_url(redirect_url or "", order.id)

        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider=provider,
            method=payment_method,
            phone=phone_raw or None,
            status=_TX_PENDING,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:{merchant_ref}",
        )
        self.db.add(txn)
        await self.db.flush()

        try:
            result = await self.pesapal.submit_order(
                merchant_reference=merchant_ref,
                amount=charge_amount,
                currency=settings.PAYMENT_CURRENCY,
                description=f"FARUMASI {order.order_code}",
                callback_url=callback,
                email=customer_email,
                phone=_display_phone(phone_raw or "0780000000"),
                first_name=first,
                last_name=last,
            )
            txn.provider_reference = result.get("order_tracking_id") or merchant_ref
        except Exception as exc:
            logger.exception("Pesapal initiate failed for order %s", order.id)
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(exc)[:500]
            await self._notify_payment_failed(order)
            await self.db.commit()
            raise BusinessRuleError(_payment_user_message(exc)) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={"amount": charge_amount, "provider": provider, "method": payment_method},
        )
        await self.db.commit()

        fee_note = (
            f" Includes {int(settings.PAYMENT_PROCESSING_FEE_PERCENT or 0)}% processing fee."
            if processing_fee > 0
            else ""
        )
        default_message = (
            "Complete your card payment on Pesapal."
            if payment_method == "card"
            else "Complete your MTN MoMo payment on Pesapal."
        )
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=charge_amount,
            order_amount=due,
            processing_fee=processing_fee,
            provider=provider,
            external_id=merchant_ref,
            checkout_url=result["redirect_url"],
            message=f"{checkout_message or default_message}{fee_note}",
            payment_method=payment_method,
        )

    async def _initiate_pesapal_card(
        self,
        order: Order,
        actor: User,
        *,
        merchant_ref: str,
        customer_name: str,
        customer_email: str,
        phone_raw: str,
        redirect_url: Optional[str],
        due: float,
        charge_amount: float,
        processing_fee: float,
    ) -> PaymentInitiateOut:
        return await self._initiate_pesapal_checkout(
            order,
            actor,
            merchant_ref=merchant_ref,
            customer_name=customer_name,
            customer_email=customer_email,
            phone_raw=phone_raw,
            redirect_url=redirect_url,
            due=due,
            charge_amount=charge_amount,
            processing_fee=processing_fee,
            payment_method="card",
            provider="pesapal",
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)
        due = amount_due_for_order(order)
        fee = payment_processing_fee(due) if due > 0 else 0

        if order.payment_status == PaymentStatus.PENDING:
            txn = await self._latest_transaction(order.id)
            if txn and txn.status == _TX_PENDING:
                if txn.provider == "mtn_madapi":
                    await self._sync_mtn_transaction(txn, order)
                elif txn.provider in ("pesapal", "pesapal_momo"):
                    await self._sync_pesapal_transaction(txn, order)

        return PaymentStatusOut(
            order_id=order.id,
            payment_status=order.payment_status,
            amount_due=due,
            amount_paid=float(order.total_amount) if order.payment_status == PaymentStatus.PAID else None,
            payment_method=order.payment_method,
            payment_reference=order.payment_reference,
            processing_fee=fee if order.payment_status != PaymentStatus.PAID else None,
            message=self._status_message(order),
        )

    async def handle_pesapal_webhook(
        self,
        *,
        order_tracking_id: Optional[str] = None,
        merchant_reference: Optional[str] = None,
    ) -> dict:
        ref = merchant_reference or ""
        txn = None
        if ref:
            txn = await self._find_transaction_by_ref(ref)
        if not txn and order_tracking_id:
            txn = await self._find_transaction_by_provider_ref(order_tracking_id)
        if not txn:
            return {"status": "error", "message": "unknown transaction"}

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            return {"status": "error", "message": "order not found"}

        if order_tracking_id and not txn.provider_reference:
            txn.provider_reference = order_tracking_id

        await self._sync_pesapal_transaction(txn, order)
        await self.db.commit()
        return {"status": "ok"}

    async def handle_mtn_madapi_webhook(self, body: dict) -> dict:
        ref = (
            str(body.get("externalTransactionId") or body.get("correlatorId") or body.get("transactionId") or "")
        ).strip()
        if not ref:
            return {"status": "ignored"}
        txn = await self._find_transaction_by_ref(ref)
        if not txn:
            return {"status": "error", "message": "unknown transaction"}
        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            return {"status": "error", "message": "order not found"}
        await self._sync_mtn_transaction(txn, order)
        await self.db.commit()
        return {"status": "ok"}

    async def handle_flutterwave_webhook(self, body: dict, *, verif_hash: str) -> dict:
        return {"status": "ignored", "message": "flutterwave disabled"}

    async def _sync_mtn_transaction(self, txn: PaymentTransaction, order: Order) -> None:
        ref = txn.external_id
        if not ref:
            return
        try:
            data = await self.mtn.get_transaction_status(ref)
        except Exception:
            logger.exception("MTN status sync failed for %s", ref)
            return
        if not data:
            return
        if MtnMadapiService.is_payment_successful(data):
            provider_ref = str(data.get("transactionId") or txn.provider_reference or ref)
            await self._confirm_transaction(txn, order, provider_reference=provider_ref)
            await self.db.commit()
        elif MtnMadapiService.is_payment_failed(data):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(data.get("statusMessage") or "failed")[:500]
            await self.db.commit()

    async def _sync_pesapal_transaction(self, txn: PaymentTransaction, order: Order) -> None:
        tracking_id = txn.provider_reference
        if not tracking_id:
            return
        try:
            data = await self.pesapal.get_transaction_status(tracking_id)
        except Exception:
            logger.exception("Pesapal status sync failed for %s", tracking_id)
            return
        if not data:
            return
        if PesapalService.is_payment_completed(data):
            ref = str(data.get("confirmation_code") or tracking_id)
            await self._confirm_transaction(txn, order, provider_reference=ref)
            await self.db.commit()
        elif PesapalService.is_payment_failed(data):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(data.get("payment_status_description") or "failed")[:500]
            await self.db.commit()

    async def _find_transaction_by_ref(self, tx_ref: str) -> Optional[PaymentTransaction]:
        result = await self.db.execute(
            select(PaymentTransaction).where(PaymentTransaction.external_id == tx_ref)
        )
        return result.scalar_one_or_none()

    async def _find_transaction_by_provider_ref(self, provider_ref: str) -> Optional[PaymentTransaction]:
        result = await self.db.execute(
            select(PaymentTransaction).where(PaymentTransaction.provider_reference == provider_ref)
        )
        return result.scalar_one_or_none()

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

    async def _notify_payment_failed(self, order: Order) -> None:
        patient_user_id = (
            await self.db.execute(
                select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        if patient_user_id:
            await NotificationService(self.db).payment_failed(
                patient_user_id, order.id, order_code=order.order_code
            )

    @staticmethod
    def _status_message(order: Order) -> str:
        if order.payment_status == PaymentStatus.PAID:
            return "Payment confirmed."
        if order.payment_status == PaymentStatus.PENDING:
            if order.payment_method == "card":
                return "Waiting for card payment on Pesapal."
            return "Waiting for MTN MoMo approval on your phone."
        if order.payment_status == PaymentStatus.FAILED:
            return "Payment failed. You can try again."
        return "Payment not started yet."
