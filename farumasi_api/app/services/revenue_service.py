from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import RevenueStatus, WithdrawalStatus
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.schemas.revenue import WithdrawalCreate, RevenueSummary
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.user import User


class RevenueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(
        self,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> RevenueSummary:
        query = select(RevenueRecord)
        if pharmacy_id:
            query = query.where(RevenueRecord.pharmacy_id == pharmacy_id)
        if partner_company_id:
            query = query.where(RevenueRecord.partner_company_id == partner_company_id)

        result = await self.db.execute(query)
        records = list(result.scalars().all())

        gross = sum(float(r.gross_amount) for r in records)
        commission = sum(float(r.platform_commission) for r in records)
        net = sum(float(r.net_amount) for r in records)
        available = sum(float(r.net_amount) for r in records if r.status == RevenueStatus.AVAILABLE)
        pending = sum(float(r.net_amount) for r in records if r.status == RevenueStatus.PENDING)
        withdrawn = sum(float(r.net_amount) for r in records if r.status == RevenueStatus.WITHDRAWN)

        return RevenueSummary(
            total_gross=gross,
            total_commission=commission,
            total_net=net,
            available_balance=available,
            pending_balance=pending,
            withdrawn_total=withdrawn,
        )

    async def request_withdrawal(
        self,
        data: WithdrawalCreate,
        actor: User,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> WithdrawalRequest:
        # Check available balance
        summary = await self.get_summary(pharmacy_id=pharmacy_id, partner_company_id=partner_company_id)
        if data.amount > summary.available_balance:
            raise BusinessRuleError(
                f"Withdrawal amount ({data.amount}) exceeds available balance ({summary.available_balance:.2f})"
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
        return withdrawal

    async def approve_withdrawal(self, withdrawal_id: str, actor: User, notes: Optional[str] = None) -> WithdrawalRequest:
        w = await self._get_withdrawal(withdrawal_id)
        w.status = WithdrawalStatus.APPROVED
        w.admin_notes = notes
        w.processed_by_user_id = actor.id
        await self.db.flush()

        notif = NotificationService(self.db)
        await notif.withdrawal_status(w.requester_user_id, float(w.amount), "approved")
        await AuditService(self.db).log(
            actor_user_id=actor.id, action="withdrawal.approved",
            entity_type="WithdrawalRequest", entity_id=w.id,
        )
        return w

    async def reject_withdrawal(self, withdrawal_id: str, actor: User, notes: Optional[str] = None) -> WithdrawalRequest:
        w = await self._get_withdrawal(withdrawal_id)
        w.status = WithdrawalStatus.REJECTED
        w.admin_notes = notes
        w.processed_by_user_id = actor.id
        await self.db.flush()

        notif = NotificationService(self.db)
        await notif.withdrawal_status(w.requester_user_id, float(w.amount), "rejected")
        return w

    async def mark_paid(self, withdrawal_id: str, actor: User) -> WithdrawalRequest:
        from datetime import datetime, timezone
        w = await self._get_withdrawal(withdrawal_id)
        w.status = WithdrawalStatus.PAID
        w.processed_at = datetime.now(timezone.utc)
        await self.db.flush()
        return w

    async def _get_withdrawal(self, withdrawal_id: str) -> WithdrawalRequest:
        result = await self.db.execute(
            select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
        )
        w = result.scalar_one_or_none()
        if not w:
            raise NotFoundError("Withdrawal request", withdrawal_id)
        return w
