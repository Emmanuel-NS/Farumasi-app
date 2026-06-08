from __future__ import annotations

import logging
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


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.orders = OrderRepository(db)
        self.momo = MomoCollectionService()

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

    async def initiate_momo(
        self, order_id: str, actor: User, phone: str
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

        order.payment_method = "momo"
        order.payment_phone = msisdn
        order.payment_status = PaymentStatus.PENDING

        reference_id = str(uuid.uuid4())
        txn = PaymentTransaction(
            order_id=order.id,
            amount=due,
            currency=settings.MTN_MOMO_CURRENCY,
            provider="mtn_momo",
            method="momo",
            phone=msisdn,
            status=_TX_PENDING,
            external_id=reference_id,
            idempotency_key=f"{order.id}:{reference_id}",
        )
        self.db.add(txn)
        await self.db.flush()

        mode = (settings.PAYMENT_MODE or "sandbox").lower()
        if mode == "sandbox":
            await self._confirm_transaction(txn, order, provider_reference=f"SANDBOX-{reference_id[:8]}")
            await self.db.commit()
            return PaymentInitiateOut(
                order_id=order.id,
                payment_status=PaymentStatus.PAID,
                amount=due,
                provider="mtn_momo_sandbox",
                external_id=reference_id,
                message="Sandbox payment confirmed. Approve the MoMo prompt on your phone in production.",
            )

        if not self.momo.is_configured():
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = "MoMo provider not configured"
            await self.db.commit()
            raise BusinessRuleError(
                "Mobile money payments are not configured. Contact FARUMASI support."
            )

        try:
            await self.momo.request_to_pay(
                reference_id=reference_id,
                amount=due,
                phone=msisdn,
                payer_message=f"FARUMASI {order.order_code}",
            )
        except Exception as exc:
            logger.exception("MoMo initiate failed for order %s", order.id)
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = str(exc)[:500]
            await self.db.commit()
            raise BusinessRuleError(
                "Could not start mobile money payment. Check your number and try again."
            ) from exc

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="payment.initiated",
            entity_type="Order",
            entity_id=order.id,
            new_value={"amount": due, "phone": msisdn[-4:]},
        )
        await self.db.commit()
        return PaymentInitiateOut(
            order_id=order.id,
            payment_status=PaymentStatus.PENDING,
            amount=due,
            provider="mtn_momo",
            external_id=reference_id,
            message="Check your phone and approve the MTN MoMo payment request.",
        )

    async def get_status(self, order_id: str, actor: User) -> PaymentStatusOut:
        order = await self._get_patient_order(order_id, actor)
        due = amount_due_for_order(order)

        if order.payment_status == PaymentStatus.PENDING and self.momo.is_configured():
            txn = await self._latest_transaction(order.id)
            if txn and txn.external_id and txn.status == _TX_PENDING:
                remote = await self.momo.get_status(txn.external_id)
                if remote == "SUCCESSFUL":
                    await self._confirm_transaction(txn, order, provider_reference=txn.external_id)
                    await self.db.commit()
                elif remote in ("FAILED", "REJECTED", "TIMEOUT"):
                    order.payment_status = PaymentStatus.FAILED
                    txn.status = _TX_FAILED
                    txn.failure_reason = remote
                    await self.db.commit()

        return PaymentStatusOut(
            order_id=order.id,
            payment_status=order.payment_status,
            amount_due=due,
            amount_paid=float(order.total_amount) if order.payment_status == PaymentStatus.PAID else None,
            payment_method=order.payment_method,
            payment_reference=order.payment_reference,
            message=self._status_message(order.payment_status),
        )

    async def handle_momo_webhook(
        self, reference_id: str, status: str, financial_transaction_id: Optional[str] = None
    ) -> bool:
        """Idempotent webhook handler. Returns True if processed."""
        result = await self.db.execute(
            select(PaymentTransaction).where(PaymentTransaction.external_id == reference_id)
        )
        txn = result.scalar_one_or_none()
        if not txn:
            logger.warning("Webhook for unknown reference %s", reference_id)
            return False
        if txn.status == _TX_SUCCESS:
            return True

        order = await self.orders.get_by_id(txn.order_id)
        if not order:
            return False

        normalized = (status or "").upper()
        if normalized == "SUCCESSFUL":
            await self._confirm_transaction(
                txn, order, provider_reference=financial_transaction_id or reference_id
            )
        elif normalized in ("FAILED", "REJECTED", "TIMEOUT"):
            order.payment_status = PaymentStatus.FAILED
            txn.status = _TX_FAILED
            txn.failure_reason = normalized
        await self.db.commit()
        return True

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
        txn.provider_reference = provider_reference
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
            return "Waiting for MoMo approval on your phone."
        if status == PaymentStatus.FAILED:
            return "Payment failed. You can try again."
        return "Payment not started yet."
