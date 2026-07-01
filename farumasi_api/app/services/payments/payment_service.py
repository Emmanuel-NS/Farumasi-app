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
from app.schemas.payment import (
    ManualPaymentReject,
    ManualPaymentReview,
    OrderPaymentContextOut,
    PaymentInitiateOut,
    PaymentStatusOut,
    PaymentTransactionOut,
)
from app.services.platform_settings_service import PlatformSettingsService
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.payments.payment_helpers import (
    amount_paid_on_order,
    balance_due_for_order,
    order_payment_breakdown,
    order_ready_for_fulfilment,
    payable_balance_for_order,
)
from app.services.payments.momo_collection_service import normalize_rwanda_phone
from app.services.payments.mtn_madapi_service import MtnMadapiService
from app.services.payments.pesapal_service import PesapalService

logger = logging.getLogger(__name__)

_TX_SUCCESS = "successful"
_TX_PENDING = "pending"
_TX_FAILED = "failed"
_TX_AWAITING_REVIEW = "awaiting_review"
_TX_REJECTED = "rejected"


def amount_due_for_order(order: Order) -> float:
    """Remaining order value due through the app (excludes processing fees)."""
    return payable_balance_for_order(order)


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


def payment_processing_fee(amount: float, *, method: str | None = None) -> float:
    if method == "manual_momo":
        return 0.0
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
            "MTN MoMo is temporarily unavailable. Pay with card or try again later."
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
        if balance_due_for_order(order) <= 0.01:
            raise BusinessRuleError("This order is already paid.")
        if await self._active_manual_review_txn(order.id):
            raise BusinessRuleError(
                "Payment proof is already under review. Please wait for confirmation."
            )

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
                expected_order_amount=due,
                processing_fee_amount=processing_fee,
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
            expected_order_amount=due,
            processing_fee_amount=processing_fee,
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
    ) -> PaymentInitiateOut:
        if not self.pesapal.is_configured():
            order.payment_status = PaymentStatus.FAILED
            await self.db.commit()
            raise BusinessRuleError(
                "Card payments are not configured. Contact FARUMASI support."
            )

        first, last = _split_name(customer_name)
        callback = _sanitize_callback_url(redirect_url or "", order.id)

        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider="pesapal",
            method="card",
            phone=phone_raw or None,
            status=_TX_PENDING,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:{merchant_ref}",
            expected_order_amount=due,
            processing_fee_amount=processing_fee,
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
            new_value={"amount": charge_amount, "provider": "pesapal", "method": "card"},
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
            provider="pesapal",
            external_id=merchant_ref,
            checkout_url=result["redirect_url"],
            message=f"Complete your card payment on Pesapal.{fee_note}",
            payment_method="card",
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
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)

        if order.payment_status == PaymentStatus.PENDING:
            txn = await self._latest_transaction(order.id)
            if txn and txn.status == _TX_PENDING:
                if txn.provider == "mtn_madapi":
                    await self._sync_mtn_transaction(txn, order)
                elif txn.provider == "pesapal":
                    await self._sync_pesapal_transaction(txn, order)

        pending_txn = await self._latest_transaction(order.id)
        pending_id = None
        submitted_at = None
        if pending_txn and pending_txn.status in (_TX_PENDING, _TX_AWAITING_REVIEW):
            pending_id = pending_txn.id
            if pending_txn.submitted_at:
                submitted_at = pending_txn.submitted_at.isoformat()

        breakdown = order_payment_breakdown(order)
        payable = breakdown["payable_balance"]
        awaiting_manual = order.payment_status == PaymentStatus.AWAITING_REVIEW
        manual_fee_free = (
            awaiting_manual
            or order.payment_method == "manual_momo"
            or (pending_txn and pending_txn.method == "manual_momo")
        )
        proc_on_balance = (
            0.0
            if manual_fee_free
            else (payment_processing_fee(payable) if payable > 0 else 0)
        )
        charge = round(payable + proc_on_balance, 0) if payable > 0 else 0
        admin_note = await self._latest_admin_payment_note(order.id)

        return PaymentStatusOut(
            order_id=order.id,
            payment_status=order.payment_status,
            amount_due=payable,
            amount_paid=amount_paid_on_order(order) if amount_paid_on_order(order) > 0 else None,
            payment_method=order.payment_method,
            payment_reference=order.payment_reference,
            processing_fee=proc_on_balance if payable > 0 else None,
            message=self._status_message(order),
            pending_transaction_id=pending_id,
            submitted_at=submitted_at,
            processing_fee_on_balance=proc_on_balance if payable > 0 else None,
            charge_amount=charge if payable > 0 else None,
            admin_review_note=admin_note,
            can_submit_payment=payable > 0.01 and not awaiting_manual,
            awaiting_manual_review=awaiting_manual,
            **breakdown,
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
        order_amt = float(txn.expected_order_amount or 0)
        if order_amt <= 0:
            order_amt = balance_due_for_order(order)
        fee = float(txn.processing_fee_amount or payment_processing_fee(order_amt))
        paid_before_fulfil = order_ready_for_fulfilment(order, amount_paid_on_order(order))
        await self._apply_order_payment(
            order,
            txn,
            order_amount=order_amt,
            processing_fee=fee,
            reference=provider_reference,
            method=txn.method,
            paid_before_fulfil=paid_before_fulfil,
        )

    async def _apply_order_payment(
        self,
        order: Order,
        txn: Optional[PaymentTransaction],
        *,
        order_amount: float,
        processing_fee: float,
        reference: str,
        method: str,
        outcome: Optional[str] = None,
        paid_before_fulfil: bool = False,
        notify: bool = True,
    ) -> None:
        from datetime import timedelta

        from app.core.constants import PARTNER_RESPONSE_TIMEOUT_MINUTES

        order_amount = round(float(order_amount), 2)
        processing_fee = round(float(processing_fee), 2)
        if txn is not None:
            txn.order_amount_applied = order_amount
            txn.processing_fee_amount = processing_fee
            txn.amount = round(order_amount + processing_fee, 0)
            if outcome:
                txn.approval_outcome = outcome

        paid_before = amount_paid_on_order(order)
        new_paid = round(paid_before + order_amount, 2)
        order.amount_paid_order = new_paid
        order.amount_paid_snapshot = new_paid
        order.payment_reference = reference
        if method != "none":
            order.payment_method = method

        balance = balance_due_for_order(order, new_paid)
        if balance <= 0.01:
            order.payment_status = PaymentStatus.PAID
        elif new_paid > 0.01:
            order.payment_status = PaymentStatus.PARTIALLY_PAID
        else:
            order.payment_status = PaymentStatus.UNPAID

        if order_ready_for_fulfilment(order, new_paid) and not paid_before_fulfil:
            order.partner_response_due_at = datetime.now(timezone.utc) + timedelta(
                minutes=PARTNER_RESPONSE_TIMEOUT_MINUTES
            )
            from app.services.order_service import OrderService

            await OrderService(self.db).activate_order_for_partners(order)

        await self.db.flush()

        if not notify:
            return

        patient_user_id = (
            await self.db.execute(
                select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        if not patient_user_id:
            return

        if order.payment_status == PaymentStatus.PAID:
            title = "Payment confirmed"
            message = f"Your payment for order {order.order_code} was successful."
        elif order.payment_status == PaymentStatus.PARTIALLY_PAID:
            title = "Partial payment received"
            message = (
                f"We recorded RWF {int(order_amount):,} for order {order.order_code}. "
                f"Remaining balance: RWF {int(balance):,}."
            )
        else:
            return

        await NotificationService(self.db).send(
            patient_user_id,
            title=title,
            message=message,
            category="order",
            action_url=f"/orders/{order.id}",
        )

    async def _mark_paid(self, order: Order, *, reference: str, method: str) -> None:
        due = balance_due_for_order(order)
        paid_before_fulfil = order_ready_for_fulfilment(order, amount_paid_on_order(order))
        await self._apply_order_payment(
            order,
            None,
            order_amount=due,
            processing_fee=0.0,
            reference=reference,
            method=method,
            paid_before_fulfil=paid_before_fulfil,
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
        if order.payment_status == PaymentStatus.PARTIALLY_PAID:
            balance = balance_due_for_order(order)
            payable = payable_balance_for_order(order)
            if payable <= 0.01 and order.defer_delivery_fee and float(order.delivery_fee or 0) > 0:
                return (
                    f"Medicines paid. Delivery fee (RWF {int(float(order.delivery_fee or 0)):,}) "
                    f"will be collected when your order arrives."
                )
            if order.defer_delivery_fee and float(order.delivery_fee or 0) > 0:
                return (
                    f"Partial payment received. RWF {int(payable):,} still due now "
                    f"(delivery fee may be collected on arrival)."
                )
            return f"Partial payment received. RWF {int(payable):,} remaining on this order."
        if order.payment_status == PaymentStatus.AWAITING_REVIEW:
            return (
                "We received your payment proof. Our team will verify it shortly — "
                "you will be notified once confirmed."
            )
        if order.payment_status == PaymentStatus.PENDING:
            if order.payment_method == "card":
                return "Waiting for card payment on Pesapal."
            if order.payment_method == "manual_momo":
                return "Submit your MoMo payment proof to complete checkout."
            return "Waiting for MTN MoMo approval on your phone."
        if order.payment_status == PaymentStatus.FAILED:
            return "Payment failed. You can try again."
        return "Payment not started yet."

    async def _latest_admin_payment_note(self, order_id: str) -> Optional[str]:
        """Most recent finance note on a reviewed manual MoMo transaction."""
        result = await self.db.execute(
            select(PaymentTransaction)
            .where(
                PaymentTransaction.order_id == order_id,
                PaymentTransaction.provider == "manual_momo",
                PaymentTransaction.status.in_([_TX_REJECTED, _TX_SUCCESS]),
                PaymentTransaction.admin_review_note.isnot(None),
            )
            .order_by(PaymentTransaction.reviewed_at.desc().nullslast(), PaymentTransaction.created_at.desc())
            .limit(1)
        )
        txn = result.scalar_one_or_none()
        if not txn or not txn.admin_review_note:
            return None
        return txn.admin_review_note.strip() or None

    async def _active_manual_review_txn(self, order_id: str) -> Optional[PaymentTransaction]:
        result = await self.db.execute(
            select(PaymentTransaction)
            .where(
                PaymentTransaction.order_id == order_id,
                PaymentTransaction.provider == "manual_momo",
                PaymentTransaction.status == _TX_AWAITING_REVIEW,
            )
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _momo_txn_id_in_use(self, momo_id: str, *, exclude_txn_id: Optional[str] = None) -> bool:
        q = select(PaymentTransaction.id).where(
            PaymentTransaction.confirmed_momo_transaction_id == momo_id.strip()
        )
        if exclude_txn_id:
            q = q.where(PaymentTransaction.id != exclude_txn_id)
        row = (await self.db.execute(q.limit(1))).scalar_one_or_none()
        return row is not None

    async def submit_manual_payment(
        self,
        order_id: str,
        actor: User,
        *,
        proof_urls: list[str],
        patient_note: Optional[str] = None,
        claimed_reference: Optional[str] = None,
        phone: Optional[str] = None,
    ) -> PaymentStatusOut:
        pay_cfg = await PlatformSettingsService(self.db).get_payment_config()
        if not pay_cfg.get("manual_momo_enabled", True):
            raise BusinessRuleError("Manual MoMo payments are not available right now.")

        order = await self._get_patient_order(order_id, actor)
        if payable_balance_for_order(order) <= 0.01:
            raise BusinessRuleError("This order is already paid.")
        existing_review = await self._active_manual_review_txn(order.id)
        if existing_review:
            return await self.get_status(order.id, actor)

        due = amount_due_for_order(order)
        processing_fee = payment_processing_fee(due, method="manual_momo")
        charge_amount = round(due + processing_fee, 0)

        if charge_amount <= 0:
            await self._mark_paid(order, reference=f"ZERO-{order.order_code}", method="none")
            await self.db.commit()
            return await self.get_status(order.id, actor)

        cleaned_urls = [u.strip() for u in proof_urls if u and u.strip()]
        if not cleaned_urls:
            raise ValidationError("Upload at least one payment proof image or document.")

        phone_raw = (phone or order.payment_phone or actor.phone or "").strip()
        msisdn = None
        if phone_raw:
            try:
                msisdn = normalize_rwanda_phone(phone_raw)
            except ValueError:
                msisdn = phone_raw

        merchant_ref = _merchant_reference(order)
        now = datetime.now(timezone.utc)
        txn = PaymentTransaction(
            order_id=order.id,
            amount=charge_amount,
            currency=settings.PAYMENT_CURRENCY,
            provider="manual_momo",
            method="manual_momo",
            phone=msisdn,
            status=_TX_AWAITING_REVIEW,
            external_id=merchant_ref,
            idempotency_key=f"{order.id}:manual:{merchant_ref}",
            proof_urls=cleaned_urls,
            patient_note=(patient_note or "").strip() or None,
            provider_reference=(claimed_reference or "").strip() or None,
            submitted_at=now,
            expected_order_amount=due,
            processing_fee_amount=processing_fee,
        )
        self.db.add(txn)
        order.payment_method = "manual_momo"
        order.payment_phone = msisdn
        order.payment_status = PaymentStatus.AWAITING_REVIEW
        order.partner_response_due_at = None
        await self.db.flush()

        notif = NotificationService(self.db)
        msg = (
            f"Order {order.order_code}: RWF {int(charge_amount):,} manual MoMo payment "
            f"awaiting review ({len(cleaned_urls)} proof file(s))."
        )
        await notif.broadcast_to_role(
            UserRole.FINANCE_ADMIN,
            title="Manual payment to review",
            message=msg,
            category="payment",
            action_url="/finance/manual-payments",
        )
        await notif.broadcast_to_role(
            UserRole.SUPER_ADMIN,
            title="Manual payment to review",
            message=msg,
            category="payment",
            action_url="/finance/manual-payments",
        )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.manual.submitted",
            entity_type="PaymentTransaction",
            entity_id=txn.id,
            new_value={"order_id": order.id, "amount": charge_amount, "proof_count": len(cleaned_urls)},
        )
        await self.db.commit()
        return await self.get_status(order.id, actor)

    async def list_manual_payments(
        self,
        *,
        status: Optional[str] = None,
    ) -> list[PaymentTransactionOut]:
        q = (
            select(PaymentTransaction, Order, User)
            .join(Order, PaymentTransaction.order_id == Order.id)
            .join(PatientProfile, Order.patient_id == PatientProfile.id)
            .join(User, PatientProfile.user_id == User.id)
            .where(PaymentTransaction.provider == "manual_momo")
            .order_by(PaymentTransaction.submitted_at.desc().nullslast(), PaymentTransaction.created_at.desc())
        )
        if status:
            q = q.where(PaymentTransaction.status == status)
        rows = (await self.db.execute(q)).all()
        return [self._txn_out(txn, order, patient_user) for txn, order, patient_user in rows]

    async def pending_manual_payment_count(self) -> int:
        from sqlalchemy import func

        result = await self.db.execute(
            select(func.count())
            .select_from(PaymentTransaction)
            .where(
                PaymentTransaction.provider == "manual_momo",
                PaymentTransaction.status == _TX_AWAITING_REVIEW,
            )
        )
        return int(result.scalar_one() or 0)

    async def approve_manual_payment(
        self,
        txn_id: str,
        admin: User,
        data: ManualPaymentReview,
    ) -> PaymentTransactionOut:
        txn = await self._get_manual_txn(txn_id)
        if txn.status != _TX_AWAITING_REVIEW:
            raise BusinessRuleError("This payment is not awaiting review.")

        momo_id = data.momo_transaction_id.strip()
        if await self._momo_txn_id_in_use(momo_id, exclude_txn_id=txn.id):
            raise BusinessRuleError(
                "This MoMo transaction ID was already used for another payment."
            )

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            raise NotFoundError("Order", txn.order_id)

        outcome = (data.outcome or "full").strip().lower()
        if outcome not in ("full", "partial", "delivery_deferred"):
            raise ValidationError("Outcome must be full, partial, or delivery_deferred.")

        paid_so_far = amount_paid_on_order(order)
        balance_before = balance_due_for_order(order, paid_so_far)

        if outcome == "delivery_deferred":
            if float(order.delivery_fee or 0) <= 0:
                raise ValidationError("This order has no delivery fee to defer.")
            order.defer_delivery_fee = True
            balance_before = balance_due_for_order(order, paid_so_far)
            amount_received = (
                round(float(data.amount_received), 2)
                if data.amount_received is not None
                else balance_before
            )
        elif outcome == "full":
            amount_received = balance_before
        else:
            if data.amount_received is None or float(data.amount_received) <= 0:
                raise ValidationError("Enter the amount the patient paid for a partial payment.")
            amount_received = round(float(data.amount_received), 2)
            if amount_received >= balance_before - 0.01:
                amount_received = balance_before
                outcome = "full"

        if amount_received > balance_before + 0.01:
            raise ValidationError(
                f"Amount received ({int(amount_received):,} RWF) exceeds balance due "
                f"({int(balance_before):,} RWF)."
            )

        now = datetime.now(timezone.utc)
        txn.confirmed_momo_transaction_id = momo_id
        txn.admin_review_note = (data.review_note or "").strip() or None
        txn.reviewed_at = now
        txn.reviewed_by_user_id = admin.id
        txn.status = _TX_SUCCESS
        txn.paid_at = now
        proc_fee = payment_processing_fee(amount_received)
        paid_before_fulfil = order_ready_for_fulfilment(order, paid_so_far)
        await self._apply_order_payment(
            order,
            txn,
            order_amount=amount_received,
            processing_fee=proc_fee,
            reference=momo_id,
            method=txn.method,
            outcome=outcome,
            paid_before_fulfil=paid_before_fulfil,
            notify=False,
        )

        patient_user_id = (
            await self.db.execute(
                select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        if patient_user_id:
            balance_after = balance_due_for_order(order)
            if order.payment_status == PaymentStatus.PAID:
                msg = f"Your manual MoMo payment for order {order.order_code} was approved."
            elif outcome == "delivery_deferred":
                msg = (
                    f"Payment approved for order {order.order_code}. "
                    f"Delivery fee (RWF {int(float(order.delivery_fee or 0)):,}) "
                    f"will be collected on arrival."
                )
                if balance_after > 0.01:
                    msg += f" Remaining balance: RWF {int(balance_after):,}."
            else:
                msg = (
                    f"Partial payment of RWF {int(amount_received):,} approved for order "
                    f"{order.order_code}. Remaining balance: RWF {int(balance_after):,}."
                )
            if txn.admin_review_note:
                msg += f" Note: {txn.admin_review_note.strip()}"
            await NotificationService(self.db).send(
                patient_user_id,
                title="Payment update",
                message=msg,
                category="order",
                action_url=f"/orders/{order.id}",
            )

        await AuditService(self.db).log(
            actor_user_id=admin.id,
            action="payment.manual.approved",
            entity_type="PaymentTransaction",
            entity_id=txn.id,
            new_value={"momo_transaction_id": momo_id, "order_id": order.id, "outcome": outcome, "amount_received": amount_received},
        )
        await self.db.commit()

        patient_user = (
            await self.db.execute(
                select(User)
                .join(PatientProfile, PatientProfile.user_id == User.id)
                .where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        return self._txn_out(txn, order, patient_user)

    async def reject_manual_payment(
        self,
        txn_id: str,
        admin: User,
        data: ManualPaymentReject,
    ) -> PaymentTransactionOut:
        txn = await self._get_manual_txn(txn_id)
        if txn.status != _TX_AWAITING_REVIEW:
            raise BusinessRuleError("This payment is not awaiting review.")

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            raise NotFoundError("Order", txn.order_id)

        now = datetime.now(timezone.utc)
        txn.status = _TX_REJECTED
        txn.admin_review_note = data.review_note.strip()
        txn.reviewed_at = now
        txn.reviewed_by_user_id = admin.id
        paid_so_far = amount_paid_on_order(order)
        if paid_so_far > 0.01:
            order.payment_status = PaymentStatus.PARTIALLY_PAID
        else:
            order.payment_status = PaymentStatus.UNPAID
        order.partner_response_due_at = None
        await self.db.flush()

        patient_user_id = (
            await self.db.execute(
                select(PatientProfile.user_id).where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        if patient_user_id:
            await NotificationService(self.db).send(
                patient_user_id,
                title="Payment not confirmed",
                message=(
                    f"We could not verify your MoMo payment for order {order.order_code}. "
                    f"{data.review_note.strip()}"
                ),
                category="order",
                action_url=f"/orders/{order.id}",
            )

        await AuditService(self.db).log(
            actor_user_id=admin.id,
            action="payment.manual.rejected",
            entity_type="PaymentTransaction",
            entity_id=txn.id,
            new_value={"order_id": order.id, "reason": data.review_note.strip()},
        )
        await self.db.commit()

        patient_user = (
            await self.db.execute(
                select(User)
                .join(PatientProfile, PatientProfile.user_id == User.id)
                .where(PatientProfile.id == order.patient_id)
            )
        ).scalar_one_or_none()
        return self._txn_out(txn, order, patient_user)

    async def _get_manual_txn(self, txn_id: str) -> PaymentTransaction:
        result = await self.db.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.id == txn_id,
                PaymentTransaction.provider == "manual_momo",
            )
        )
        txn = result.scalar_one_or_none()
        if not txn:
            raise NotFoundError("PaymentTransaction", txn_id)
        return txn

    @staticmethod
    def _txn_out(
        txn: PaymentTransaction,
        order: Order,
        patient_user: Optional[User],
    ) -> PaymentTransactionOut:
        breakdown = order_payment_breakdown(order)
        balance = breakdown["balance_due"]
        return PaymentTransactionOut(
            id=txn.id,
            order_id=txn.order_id,
            order_code=order.order_code,
            amount=float(txn.amount),
            currency=txn.currency,
            provider=txn.provider,
            method=txn.method,
            status=txn.status,
            phone=txn.phone,
            proof_urls=list(txn.proof_urls or []),
            patient_note=txn.patient_note,
            admin_review_note=txn.admin_review_note,
            patient_name=patient_user.full_name if patient_user else None,
            patient_email=patient_user.email if patient_user else None,
            submitted_at=txn.submitted_at.isoformat() if txn.submitted_at else None,
            reviewed_at=txn.reviewed_at.isoformat() if txn.reviewed_at else None,
            paid_at=txn.paid_at.isoformat() if txn.paid_at else None,
            confirmed_momo_transaction_id=txn.confirmed_momo_transaction_id,
            created_at=txn.created_at.isoformat() if txn.created_at else None,
            expected_order_amount=float(txn.expected_order_amount)
            if txn.expected_order_amount is not None
            else float(balance),
            order_amount_applied=float(txn.order_amount_applied)
            if txn.order_amount_applied is not None
            else None,
            processing_fee_amount=float(txn.processing_fee_amount)
            if txn.processing_fee_amount is not None
            else None,
            approval_outcome=txn.approval_outcome,
            order_context=OrderPaymentContextOut(
                **breakdown,
                processing_fee_on_balance=payment_processing_fee(balance),
            ),
        )
