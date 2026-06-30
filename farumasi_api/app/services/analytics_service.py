from __future__ import annotations

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.order import Order
from app.models.delivery import Delivery
from app.models.prescription import DigitalPrescription
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.models.pharmacy import Pharmacy
from app.models.doctor import DoctorProfile
from app.models.rider import RiderProfile
from app.models.patient import PatientProfile
from app.models.payment_transaction import PaymentTransaction
from app.models.patient import PatientProfile
from app.core.constants import OrderStatus, RevenueStatus, WithdrawalStatus
from app.schemas.analytics import PaymentAnalyticsOut, PaymentMethodBreakdown
from app.schemas.payment import PaymentTransactionOut

_METHOD_LABELS = {
    "mtn_momo": "MTN MoMo",
    "card": "Card (Pesapal)",
    "manual_momo": "MoMo Pay Code",
    "none": "Zero / waived",
}


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def admin_summary(self) -> dict:
        """High-level KPI dashboard for super admin."""
        total_users = (await self.db.execute(select(func.count(User.id)))).scalar_one()
        total_orders = (await self.db.execute(select(func.count(Order.id)))).scalar_one()
        completed_orders = (await self.db.execute(
            select(func.count(Order.id)).where(Order.order_status == OrderStatus.COMPLETED)
        )).scalar_one()
        total_revenue_net = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(RevenueRecord.status == RevenueStatus.AVAILABLE)
        )).scalar_one()
        total_pharmacies = (await self.db.execute(select(func.count(Pharmacy.id)))).scalar_one()
        pending_withdrawals = (await self.db.execute(
            select(func.count(WithdrawalRequest.id)).where(
                WithdrawalRequest.status == WithdrawalStatus.PENDING
            )
        )).scalar_one()
        total_prescriptions = (await self.db.execute(
            select(func.count(DigitalPrescription.id))
        )).scalar_one()
        total_riders = (await self.db.execute(select(func.count(RiderProfile.id)))).scalar_one()
        total_doctors = (await self.db.execute(select(func.count(DoctorProfile.id)))).scalar_one()
        total_patients = (await self.db.execute(select(func.count(PatientProfile.id)))).scalar_one()

        payment = await self.payment_summary()

        return {
            "total_users": total_users,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_pharmacies": total_pharmacies,
            "total_riders": total_riders,
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_prescriptions": total_prescriptions,
            "available_revenue_net": float(total_revenue_net),
            "pending_withdrawals": pending_withdrawals,
            "total_collected": payment.total_collected,
            "successful_payments": payment.successful_count,
            "awaiting_review_payments": payment.awaiting_review_count,
            "awaiting_review_amount": payment.awaiting_review_amount,
            "payments_by_method": payment.by_method,
        }

    async def payment_summary(self) -> PaymentAnalyticsOut:
        """Aggregate patient payment transactions by method (includes manual MoMo once approved)."""
        success_status = "successful"
        review_status = "awaiting_review"
        failed_status = "failed"

        by_method_rows = (
            await self.db.execute(
                select(
                    PaymentTransaction.method,
                    func.count(PaymentTransaction.id),
                    func.coalesce(func.sum(PaymentTransaction.amount), 0.0),
                )
                .where(PaymentTransaction.status == success_status)
                .group_by(PaymentTransaction.method)
                .order_by(func.sum(PaymentTransaction.amount).desc())
            )
        ).all()

        by_method = [
            PaymentMethodBreakdown(
                method=str(method or "unknown"),
                label=_METHOD_LABELS.get(str(method or ""), str(method or "Other")),
                count=int(count or 0),
                amount=float(amount or 0),
            )
            for method, count, amount in by_method_rows
        ]

        successful_count = sum(m.count for m in by_method)
        total_collected = sum(m.amount for m in by_method)

        review_row = (
            await self.db.execute(
                select(
                    func.count(PaymentTransaction.id),
                    func.coalesce(func.sum(PaymentTransaction.amount), 0.0),
                ).where(PaymentTransaction.status == review_status)
            )
        ).one()

        failed_count = (
            await self.db.execute(
                select(func.count(PaymentTransaction.id)).where(
                    PaymentTransaction.status.in_([failed_status, "rejected"])
                )
            )
        ).scalar_one() or 0

        return PaymentAnalyticsOut(
            total_collected=float(total_collected),
            successful_count=int(successful_count),
            awaiting_review_count=int(review_row[0] or 0),
            awaiting_review_amount=float(review_row[1] or 0),
            failed_count=int(failed_count),
            by_method=by_method,
        )

    async def list_payment_transactions(
        self,
        *,
        status: str | None = None,
        method: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[PaymentTransactionOut], int]:
        """All patient payment transactions — MTN, card, manual MoMo, etc."""
        base = (
            select(PaymentTransaction, Order, User)
            .join(Order, PaymentTransaction.order_id == Order.id)
            .join(PatientProfile, Order.patient_id == PatientProfile.id)
            .join(User, PatientProfile.user_id == User.id)
        )
        count_q = select(func.count()).select_from(PaymentTransaction)
        if status:
            base = base.where(PaymentTransaction.status == status)
            count_q = count_q.where(PaymentTransaction.status == status)
        if method:
            base = base.where(PaymentTransaction.method == method)
            count_q = count_q.where(PaymentTransaction.method == method)

        total = int((await self.db.execute(count_q)).scalar_one() or 0)
        rows = (
            await self.db.execute(
                base.order_by(
                    PaymentTransaction.paid_at.desc().nullslast(),
                    PaymentTransaction.created_at.desc(),
                )
                .offset(max(offset, 0))
                .limit(min(max(limit, 1), 200))
            )
        ).all()

        from app.services.payments.payment_service import PaymentService

        items = [
            PaymentService._txn_out(txn, order, patient_user)
            for txn, order, patient_user in rows
        ]
        return items, total

    async def pharmacy_stats(self, pharmacy_id: str) -> dict:
        total_orders = (await self.db.execute(
            select(func.count(Order.id)).where(Order.pharmacy_id == pharmacy_id)
        )).scalar_one()
        completed = (await self.db.execute(
            select(func.count(Order.id)).where(
                Order.pharmacy_id == pharmacy_id,
                Order.order_status == OrderStatus.COMPLETED,
            )
        )).scalar_one()
        net = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(RevenueRecord.pharmacy_id == pharmacy_id)
        )).scalar_one()
        available = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(
                RevenueRecord.pharmacy_id == pharmacy_id,
                RevenueRecord.status == RevenueStatus.AVAILABLE,
            )
        )).scalar_one()

        return {
            "total_orders": total_orders,
            "completed_orders": completed,
            "total_net_revenue": float(net),
            "available_balance": float(available),
        }
