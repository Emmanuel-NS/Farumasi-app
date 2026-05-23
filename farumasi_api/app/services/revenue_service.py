from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import OrderStatus, RevenueStatus, UserRole, WithdrawalStatus
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.order import Order
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.schemas.revenue import WithdrawalCreate, RevenueSummary
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.user import User


# Withdrawal statuses that lock funds against the available balance.
_LOCKED_WITHDRAWAL_STATUSES = (
    WithdrawalStatus.PENDING,
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.PROCESSING,
)


class RevenueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> RevenueSummary:
        rev_q = select(RevenueRecord)
        if pharmacy_id:
            rev_q = rev_q.where(RevenueRecord.pharmacy_id == pharmacy_id)
        if partner_company_id:
            rev_q = rev_q.where(RevenueRecord.partner_company_id == partner_company_id)

        records = list((await self.db.execute(rev_q)).scalars().all())

        gross = sum(float(r.gross_amount) for r in records)
        commission = sum(float(r.platform_commission) for r in records)
        net = sum(float(r.net_amount) for r in records)
        available_records_sum = sum(
            float(r.net_amount) for r in records if r.status == RevenueStatus.AVAILABLE
        )
        pending_records_sum = sum(
            float(r.net_amount) for r in records if r.status == RevenueStatus.PENDING
        )
        withdrawn_records_sum = sum(
            float(r.net_amount) for r in records if r.status == RevenueStatus.WITHDRAWN
        )

        # Withdrawals scoped to the same entity.
        wd_q = select(WithdrawalRequest)
        if pharmacy_id:
            wd_q = wd_q.where(WithdrawalRequest.pharmacy_id == pharmacy_id)
        if partner_company_id:
            wd_q = wd_q.where(WithdrawalRequest.partner_company_id == partner_company_id)
        withdrawals = list((await self.db.execute(wd_q)).scalars().all())

        locked_withdrawals = sum(
            float(w.amount) for w in withdrawals
            if w.status in _LOCKED_WITHDRAWAL_STATUSES
        )
        paid_withdrawals = sum(
            float(w.amount) for w in withdrawals
            if w.status == WithdrawalStatus.PAID
        )

        available = max(0.0, available_records_sum - locked_withdrawals)

        # Order counts scoped to the same entity.
        order_q = select(func.count(Order.id))
        completed_q = select(func.count(Order.id)).where(
            Order.order_status == OrderStatus.COMPLETED
        )
        if pharmacy_id:
            order_q = order_q.where(Order.pharmacy_id == pharmacy_id)
            completed_q = completed_q.where(Order.pharmacy_id == pharmacy_id)
        if partner_company_id:
            order_q = order_q.where(Order.partner_company_id == partner_company_id)
            completed_q = completed_q.where(
                Order.partner_company_id == partner_company_id
            )
        total_orders = (await self.db.execute(order_q)).scalar_one() or 0
        completed_orders = (await self.db.execute(completed_q)).scalar_one() or 0

        return RevenueSummary(
            # Legacy aliases.
            total_gross=gross,
            total_commission=commission,
            total_net=net,
            available_balance=available,
            pending_balance=pending_records_sum,
            withdrawn_total=withdrawn_records_sum,
            # Canonical Phase 8 fields.
            gross_revenue=gross,
            platform_commission=commission,
            net_revenue=net,
            withdrawn_amount=withdrawn_records_sum,
            pending_withdrawals=locked_withdrawals,
            paid_withdrawals=paid_withdrawals,
            total_orders=int(total_orders),
            completed_orders=int(completed_orders),
        )

    async def list_records(
        self,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> list[RevenueRecord]:
        q = select(RevenueRecord)
        if pharmacy_id:
            q = q.where(RevenueRecord.pharmacy_id == pharmacy_id)
        if partner_company_id:
            q = q.where(RevenueRecord.partner_company_id == partner_company_id)
        q = q.order_by(RevenueRecord.created_at.desc())
        return list((await self.db.execute(q)).scalars().all())

    async def list_withdrawals(
        self,
        status: Optional[str] = None,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
        requester_user_id: Optional[str] = None,
    ) -> list[WithdrawalRequest]:
        q = select(WithdrawalRequest)
        if status:
            q = q.where(WithdrawalRequest.status == status)
        if pharmacy_id:
            q = q.where(WithdrawalRequest.pharmacy_id == pharmacy_id)
        if partner_company_id:
            q = q.where(WithdrawalRequest.partner_company_id == partner_company_id)
        if requester_user_id:
            q = q.where(WithdrawalRequest.requester_user_id == requester_user_id)
        q = q.order_by(WithdrawalRequest.created_at.desc())
        return list((await self.db.execute(q)).scalars().all())

    async def request_withdrawal(
        self,
        data: WithdrawalCreate,
        actor: User,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> WithdrawalRequest:
        # Exactly one of pharmacy_id / partner_company_id must be set.
        if not pharmacy_id and not partner_company_id:
            raise BusinessRuleError(
                "Withdrawal requires ownership of a pharmacy or partner company"
            )
        if pharmacy_id and partner_company_id:
            raise BusinessRuleError(
                "Withdrawal cannot target both a pharmacy and a partner company"
            )

        summary = await self.get_summary(
            pharmacy_id=pharmacy_id, partner_company_id=partner_company_id
        )
        if data.amount > summary.available_balance:
            raise BusinessRuleError(
                f"Withdrawal amount ({data.amount}) exceeds available balance "
                f"({summary.available_balance:.2f})"
            )

        withdrawal = WithdrawalRequest(
            requester_user_id=actor.id,
            pharmacy_id=pharmacy_id,
            partner_company_id=partner_company_id,
            amount=data.amount,
            payout_method=data.payout_method,
            payout_details=data.payout_details,
            status=WithdrawalStatus.PENDING,
        )
        self.db.add(withdrawal)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="withdrawal.requested",
            entity_type="WithdrawalRequest",
            entity_id=withdrawal.id,
        )

        # Notify finance admins + super admins (placeholder routing group)
        try:
            notif = NotificationService(self.db)
            await notif.broadcast_to_role(
                UserRole.FINANCE_ADMIN,
                title="New Withdrawal Request",
                message=f"A new withdrawal of RWF {float(withdrawal.amount):,.0f} is awaiting review.",
                category="withdrawal",
                action_url=f"/withdrawals/{withdrawal.id}",
            )
            await notif.broadcast_to_role(
                UserRole.SUPER_ADMIN,
                title="New Withdrawal Request",
                message=f"A new withdrawal of RWF {float(withdrawal.amount):,.0f} is awaiting review.",
                category="withdrawal",
                action_url=f"/withdrawals/{withdrawal.id}",
            )
        except Exception:
            pass
        return withdrawal

    async def approve_withdrawal(
        self, withdrawal_id: str, actor: User, notes: Optional[str] = None
    ) -> WithdrawalRequest:
        w = await self._get_withdrawal(withdrawal_id)
        if w.status != WithdrawalStatus.PENDING:
            raise BusinessRuleError(
                f"Cannot approve withdrawal in status '{w.status}'"
            )
        if w.requester_user_id == actor.id and actor.role != UserRole.SUPER_ADMIN:
            raise BusinessRuleError("You cannot approve your own withdrawal request")

        w.status = WithdrawalStatus.APPROVED
        w.admin_notes = notes
        w.processed_by_user_id = actor.id
        await self.db.flush()

        await NotificationService(self.db).withdrawal_status(
            w.requester_user_id, float(w.amount), "approved"
        )
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="withdrawal.approved",
            entity_type="WithdrawalRequest",
            entity_id=w.id,
        )
        return w

    async def reject_withdrawal(
        self, withdrawal_id: str, actor: User, notes: Optional[str] = None
    ) -> WithdrawalRequest:
        w = await self._get_withdrawal(withdrawal_id)
        if w.status != WithdrawalStatus.PENDING:
            raise BusinessRuleError(
                f"Cannot reject withdrawal in status '{w.status}'"
            )

        w.status = WithdrawalStatus.REJECTED
        w.admin_notes = notes
        w.processed_by_user_id = actor.id
        await self.db.flush()

        await NotificationService(self.db).withdrawal_status(
            w.requester_user_id, float(w.amount), "rejected"
        )
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="withdrawal.rejected",
            entity_type="WithdrawalRequest",
            entity_id=w.id,
        )
        return w

    async def mark_paid(self, withdrawal_id: str, actor: User) -> WithdrawalRequest:
        from datetime import datetime, timezone

        w = await self._get_withdrawal(withdrawal_id)
        if w.status not in (WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING):
            raise BusinessRuleError(
                f"Cannot mark withdrawal paid from status '{w.status}'"
            )

        # Flip matching AVAILABLE revenue records to WITHDRAWN, FIFO, until
        # the cumulative net covers the withdrawal amount.
        rec_q = select(RevenueRecord).where(
            RevenueRecord.status == RevenueStatus.AVAILABLE
        )
        if w.pharmacy_id:
            rec_q = rec_q.where(RevenueRecord.pharmacy_id == w.pharmacy_id)
        if w.partner_company_id:
            rec_q = rec_q.where(
                RevenueRecord.partner_company_id == w.partner_company_id
            )
        rec_q = rec_q.order_by(RevenueRecord.created_at.asc())
        records = list((await self.db.execute(rec_q)).scalars().all())

        target = float(w.amount)
        covered = 0.0
        for r in records:
            if covered >= target:
                break
            r.status = RevenueStatus.WITHDRAWN
            covered += float(r.net_amount)

        w.status = WithdrawalStatus.PAID
        w.processed_by_user_id = actor.id
        w.processed_at = datetime.now(timezone.utc)
        await self.db.flush()

        await NotificationService(self.db).withdrawal_status(
            w.requester_user_id, float(w.amount), "paid"
        )
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="withdrawal.paid",
            entity_type="WithdrawalRequest",
            entity_id=w.id,
        )
        return w

    async def _get_withdrawal(self, withdrawal_id: str) -> WithdrawalRequest:
        result = await self.db.execute(
            select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
        )
        w = result.scalar_one_or_none()
        if not w:
            raise NotFoundError("Withdrawal request", withdrawal_id)
        return w
