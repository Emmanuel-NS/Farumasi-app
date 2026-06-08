from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.constants import OrderStatus, RevenueStatus, UserRole, WithdrawalStatus
from app.core.exceptions import BusinessRuleError, NotFoundError
from app.models.order import Order
from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.schemas.revenue import WithdrawalCreate, WithdrawalAmountRequest, RevenueSummary
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.models.user import User


# Withdrawal statuses that lock funds against the available balance.
_LOCKED_WITHDRAWAL_STATUSES = (
    WithdrawalStatus.PENDING,
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.PROCESSING,
)

# Legacy seed data used "settled" for earned revenue — treat as available.
_AVAILABLE_STATUSES = frozenset({RevenueStatus.AVAILABLE, "settled"})


def _is_available_status(status: str) -> bool:
    return status in _AVAILABLE_STATUSES


def _is_pending_status(status: str) -> bool:
    return status == RevenueStatus.PENDING


def _is_withdrawn_status(status: str) -> bool:
    return status == RevenueStatus.WITHDRAWN


def _validate_withdrawal_amount(amount: float, available_balance: float) -> int:
    """Ensure withdrawal is a whole RWF amount within net earnings — no extra fees."""
    if amount != int(amount):
        raise BusinessRuleError("Withdrawal amount must be a whole number of RWF (no decimals)")
    whole = int(amount)
    minimum = int(settings.MIN_WITHDRAWAL_AMOUNT)
    if whole < minimum:
        raise BusinessRuleError(
            f"Minimum withdrawal is RWF {minimum:,}. You entered RWF {whole:,}."
        )
    if whole > available_balance:
        raise BusinessRuleError(
            f"Withdrawal amount (RWF {whole:,}) exceeds available net balance "
            f"(RWF {available_balance:,.0f}). Commission was already deducted from order revenue."
        )
    return whole


def _empty_summary() -> RevenueSummary:
    return RevenueSummary(
        total_gross=0.0,
        total_commission=0.0,
        total_net=0.0,
        available_balance=0.0,
        pending_balance=0.0,
        withdrawn_total=0.0,
        gross_revenue=0.0,
        platform_commission=0.0,
        net_revenue=0.0,
        withdrawn_amount=0.0,
        pending_withdrawals=0.0,
        paid_withdrawals=0.0,
        total_orders=0,
        completed_orders=0,
        pending_settlement_count=0,
        available_settlement_count=0,
        withdrawn_settlement_count=0,
    )


class RevenueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _owner_entity_ids(
        self, owner_user_id: str
    ) -> tuple[list[str], list[str]]:
        pharmacy_ids = list(
            (
                await self.db.execute(
                    select(Pharmacy.id).where(Pharmacy.owner_user_id == owner_user_id)
                )
            ).scalars().all()
        )
        partner_ids = list(
            (
                await self.db.execute(
                    select(PartnerCompany.id).where(
                        PartnerCompany.owner_user_id == owner_user_id
                    )
                )
            ).scalars().all()
        )
        return pharmacy_ids, partner_ids

    def _build_summary(
        self,
        records: list[RevenueRecord],
        withdrawals: list[WithdrawalRequest],
        total_orders: int,
        completed_orders: int,
    ) -> RevenueSummary:
        gross = sum(float(r.gross_amount) for r in records)
        commission = sum(float(r.platform_commission) for r in records)
        net = sum(float(r.net_amount) for r in records)
        available_records_sum = sum(
            float(r.net_amount) for r in records if _is_available_status(r.status)
        )
        pending_records_sum = sum(
            float(r.net_amount) for r in records if _is_pending_status(r.status)
        )
        withdrawn_records_sum = sum(
            float(r.net_amount) for r in records if _is_withdrawn_status(r.status)
        )

        locked_withdrawals = sum(
            float(w.amount) for w in withdrawals
            if w.status in _LOCKED_WITHDRAWAL_STATUSES
        )
        paid_withdrawals = sum(
            float(w.amount) for w in withdrawals
            if w.status == WithdrawalStatus.PAID
        )

        available = max(0.0, available_records_sum - locked_withdrawals)

        pending_settlement_count = sum(
            1 for r in records if _is_pending_status(r.status)
        )
        available_settlement_count = sum(
            1 for r in records if _is_available_status(r.status)
        )
        withdrawn_settlement_count = sum(
            1 for r in records if _is_withdrawn_status(r.status)
        )

        return RevenueSummary(
            total_gross=gross,
            total_commission=commission,
            total_net=net,
            available_balance=available,
            pending_balance=pending_records_sum,
            withdrawn_total=withdrawn_records_sum,
            gross_revenue=gross,
            platform_commission=commission,
            net_revenue=net,
            withdrawn_amount=withdrawn_records_sum,
            pending_withdrawals=locked_withdrawals,
            paid_withdrawals=paid_withdrawals,
            total_orders=int(total_orders),
            completed_orders=int(completed_orders),
            pending_settlement_count=pending_settlement_count,
            available_settlement_count=available_settlement_count,
            withdrawn_settlement_count=withdrawn_settlement_count,
        )

    async def get_summary(
        self,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> RevenueSummary:
        rev_q = select(RevenueRecord)
        if pharmacy_id and partner_company_id:
            rev_q = rev_q.where(
                or_(
                    RevenueRecord.pharmacy_id == pharmacy_id,
                    RevenueRecord.partner_company_id == partner_company_id,
                )
            )
        elif pharmacy_id:
            rev_q = rev_q.where(RevenueRecord.pharmacy_id == pharmacy_id)
        elif partner_company_id:
            rev_q = rev_q.where(
                RevenueRecord.partner_company_id == partner_company_id
            )

        records = list((await self.db.execute(rev_q)).scalars().all())

        wd_q = select(WithdrawalRequest)
        if pharmacy_id and partner_company_id:
            wd_q = wd_q.where(
                or_(
                    WithdrawalRequest.pharmacy_id == pharmacy_id,
                    WithdrawalRequest.partner_company_id == partner_company_id,
                )
            )
        elif pharmacy_id:
            wd_q = wd_q.where(WithdrawalRequest.pharmacy_id == pharmacy_id)
        elif partner_company_id:
            wd_q = wd_q.where(
                WithdrawalRequest.partner_company_id == partner_company_id
            )
        withdrawals = list((await self.db.execute(wd_q)).scalars().all())

        order_q = select(func.count(Order.id))
        completed_q = select(func.count(Order.id)).where(
            Order.order_status == OrderStatus.COMPLETED
        )
        if pharmacy_id and partner_company_id:
            scope = or_(
                Order.pharmacy_id == pharmacy_id,
                Order.partner_company_id == partner_company_id,
            )
            order_q = order_q.where(scope)
            completed_q = completed_q.where(scope)
        elif pharmacy_id:
            order_q = order_q.where(Order.pharmacy_id == pharmacy_id)
            completed_q = completed_q.where(Order.pharmacy_id == pharmacy_id)
        elif partner_company_id:
            order_q = order_q.where(Order.partner_company_id == partner_company_id)
            completed_q = completed_q.where(
                Order.partner_company_id == partner_company_id
            )
        total_orders = (await self.db.execute(order_q)).scalar_one() or 0
        completed_orders = (await self.db.execute(completed_q)).scalar_one() or 0

        return self._build_summary(
            records, withdrawals, int(total_orders), int(completed_orders)
        )

    async def get_summary_for_owner(self, owner_user_id: str) -> RevenueSummary:
        """Aggregate wallet balances across all pharmacies and partner companies owned by a user."""
        pharmacy_ids, partner_ids = await self._owner_entity_ids(owner_user_id)
        if not pharmacy_ids and not partner_ids:
            return _empty_summary()

        record_conds = []
        if pharmacy_ids:
            record_conds.append(RevenueRecord.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            record_conds.append(RevenueRecord.partner_company_id.in_(partner_ids))
        records = list(
            (
                await self.db.execute(
                    select(RevenueRecord).where(or_(*record_conds))
                )
            ).scalars().all()
        )

        withdrawal_conds = [WithdrawalRequest.requester_user_id == owner_user_id]
        if pharmacy_ids:
            withdrawal_conds.append(
                WithdrawalRequest.pharmacy_id.in_(pharmacy_ids)
            )
        if partner_ids:
            withdrawal_conds.append(
                WithdrawalRequest.partner_company_id.in_(partner_ids)
            )
        withdrawals = list(
            (
                await self.db.execute(
                    select(WithdrawalRequest).where(or_(*withdrawal_conds))
                )
            ).scalars().all()
        )

        order_conds = []
        if pharmacy_ids:
            order_conds.append(Order.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            order_conds.append(Order.partner_company_id.in_(partner_ids))
        order_scope = or_(*order_conds)
        total_orders = (
            await self.db.execute(select(func.count(Order.id)).where(order_scope))
        ).scalar_one() or 0
        completed_orders = (
            await self.db.execute(
                select(func.count(Order.id)).where(
                    order_scope,
                    Order.order_status == OrderStatus.COMPLETED,
                )
            )
        ).scalar_one() or 0

        return self._build_summary(
            records, withdrawals, int(total_orders), int(completed_orders)
        )

    async def list_records(
        self,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> list[RevenueRecord]:
        q = select(RevenueRecord).options(selectinload(RevenueRecord.order))
        if pharmacy_id and partner_company_id:
            q = q.where(
                or_(
                    RevenueRecord.pharmacy_id == pharmacy_id,
                    RevenueRecord.partner_company_id == partner_company_id,
                )
            )
        elif pharmacy_id:
            q = q.where(RevenueRecord.pharmacy_id == pharmacy_id)
        elif partner_company_id:
            q = q.where(RevenueRecord.partner_company_id == partner_company_id)
        q = q.order_by(RevenueRecord.created_at.desc())
        return list((await self.db.execute(q)).scalars().all())

    async def list_records_for_owner(self, owner_user_id: str) -> list[RevenueRecord]:
        pharmacy_ids, partner_ids = await self._owner_entity_ids(owner_user_id)
        if not pharmacy_ids and not partner_ids:
            return []
        conds = []
        if pharmacy_ids:
            conds.append(RevenueRecord.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            conds.append(RevenueRecord.partner_company_id.in_(partner_ids))
        q = (
            select(RevenueRecord)
            .options(selectinload(RevenueRecord.order))
            .where(or_(*conds))
            .order_by(RevenueRecord.created_at.desc())
        )
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

    async def list_withdrawals_for_owner(self, owner_user_id: str) -> list[WithdrawalRequest]:
        pharmacy_ids, partner_ids = await self._owner_entity_ids(owner_user_id)
        conds = [WithdrawalRequest.requester_user_id == owner_user_id]
        if pharmacy_ids:
            conds.append(WithdrawalRequest.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            conds.append(WithdrawalRequest.partner_company_id.in_(partner_ids))
        q = (
            select(WithdrawalRequest)
            .where(or_(*conds))
            .order_by(WithdrawalRequest.created_at.desc())
        )
        return list((await self.db.execute(q)).scalars().all())

    async def request_withdrawal_for_owner(
        self, data: WithdrawalAmountRequest, actor: User
    ) -> WithdrawalRequest:
        """Request a withdrawal against the combined wallet of all owned seller entities."""
        from app.services.payout_credentials_service import PayoutCredentialsService

        pharmacy_ids, partner_ids = await self._owner_entity_ids(actor.id)
        if not pharmacy_ids and not partner_ids:
            raise BusinessRuleError(
                "Withdrawal requires ownership of a pharmacy or partner company"
            )

        profile = await PayoutCredentialsService(self.db).get_required_profile(actor.id)

        summary = await self.get_summary_for_owner(actor.id)
        whole_amount = _validate_withdrawal_amount(data.amount, summary.available_balance)

        partner_company_id = partner_ids[0] if partner_ids else None
        pharmacy_id = pharmacy_ids[0] if pharmacy_ids and not partner_company_id else None

        payload = WithdrawalCreate(
            amount=float(whole_amount),
            payout_method=profile.payout_method,
            payout_details=profile.payout_details,
        )
        return await self._create_withdrawal(
            payload,
            actor,
            pharmacy_id=pharmacy_id,
            partner_company_id=partner_company_id,
        )

    async def _create_withdrawal(
        self,
        data: WithdrawalCreate,
        actor: User,
        *,
        pharmacy_id: Optional[str],
        partner_company_id: Optional[str],
    ) -> WithdrawalRequest:
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

        try:
            notif = NotificationService(self.db)
            await notif.broadcast_to_role(
                UserRole.FINANCE_ADMIN,
                title="New Withdrawal Request",
                message=f"A new withdrawal of RWF {float(withdrawal.amount):,.0f} is awaiting review.",
                category="withdrawal",
                action_url="/finance/withdrawals",
            )
            await notif.broadcast_to_role(
                UserRole.SUPER_ADMIN,
                title="New Withdrawal Request",
                message=f"A new withdrawal of RWF {float(withdrawal.amount):,.0f} is awaiting review.",
                category="withdrawal",
                action_url="/finance/withdrawals",
            )
        except Exception:
            pass
        return withdrawal

    async def request_withdrawal(
        self,
        data: WithdrawalAmountRequest,
        actor: User,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> WithdrawalRequest:
        from app.services.payout_credentials_service import PayoutCredentialsService

        # Exactly one of pharmacy_id / partner_company_id must be set.
        if not pharmacy_id and not partner_company_id:
            raise BusinessRuleError(
                "Withdrawal requires ownership of a pharmacy or partner company"
            )
        if pharmacy_id and partner_company_id:
            raise BusinessRuleError(
                "Withdrawal cannot target both a pharmacy and a partner company"
            )

        profile = await PayoutCredentialsService(self.db).get_required_profile(actor.id)

        summary = await self.get_summary(
            pharmacy_id=pharmacy_id, partner_company_id=partner_company_id
        )
        whole_amount = _validate_withdrawal_amount(data.amount, summary.available_balance)

        payload = WithdrawalCreate(
            amount=float(whole_amount),
            payout_method=profile.payout_method,
            payout_details=profile.payout_details,
        )
        return await self._create_withdrawal(
            payload,
            actor,
            pharmacy_id=pharmacy_id,
            partner_company_id=partner_company_id,
        )

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

    async def mark_paid(
        self,
        withdrawal_id: str,
        actor: User,
        *,
        payment_reference: str | None = None,
        payment_proof_url: str | None = None,
        notes: str | None = None,
    ) -> WithdrawalRequest:
        from datetime import datetime, timezone

        w = await self._get_withdrawal(withdrawal_id)
        if w.status not in (WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING):
            raise BusinessRuleError(
                f"Cannot mark withdrawal paid from status '{w.status}'"
            )

        # Flip matching available revenue records to WITHDRAWN, FIFO, until
        # the cumulative net covers the withdrawal amount (across all owner entities).
        pharmacy_ids, partner_ids = await self._owner_entity_ids(w.requester_user_id)
        record_conds = []
        if pharmacy_ids:
            record_conds.append(RevenueRecord.pharmacy_id.in_(pharmacy_ids))
        if partner_ids:
            record_conds.append(RevenueRecord.partner_company_id.in_(partner_ids))
        if not record_conds:
            if w.pharmacy_id:
                record_conds = [RevenueRecord.pharmacy_id == w.pharmacy_id]
            elif w.partner_company_id:
                record_conds = [
                    RevenueRecord.partner_company_id == w.partner_company_id
                ]

        rec_q = (
            select(RevenueRecord)
            .where(
                RevenueRecord.status.in_(list(_AVAILABLE_STATUSES)),
                or_(*record_conds),
            )
            .order_by(RevenueRecord.created_at.asc())
        )
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
        if payment_reference:
            w.payment_reference = payment_reference
        if payment_proof_url:
            w.payment_proof_url = payment_proof_url
        if notes:
            w.admin_notes = notes
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

    @staticmethod
    def _payout_account(details) -> Optional[str]:
        from app.schemas.revenue import payout_account_from_details

        return payout_account_from_details(details)

    @staticmethod
    def _payout_account_name(details) -> Optional[str]:
        from app.schemas.revenue import payout_account_name_from_details

        return payout_account_name_from_details(details)

    async def withdrawal_to_admin_out(self, w: WithdrawalRequest):
        from app.schemas.revenue import WithdrawalAdminOut, coerce_payout_details

        requester_name: Optional[str] = None
        requester_email: Optional[str] = None
        user_res = await self.db.execute(
            select(User.full_name, User.email).where(User.id == w.requester_user_id)
        )
        row = user_res.first()
        if row:
            requester_name, requester_email = row[0], row[1]

        seller_name: Optional[str] = None
        seller_kind: Optional[str] = None
        if w.partner_company_id:
            seller_kind = "partner_company"
            co = (
                await self.db.execute(
                    select(PartnerCompany.name).where(
                        PartnerCompany.id == w.partner_company_id
                    )
                )
            ).scalar_one_or_none()
            seller_name = co
        elif w.pharmacy_id:
            seller_kind = "pharmacy"
            ph = (
                await self.db.execute(
                    select(Pharmacy.name).where(Pharmacy.id == w.pharmacy_id)
                )
            ).scalar_one_or_none()
            seller_name = ph

        return WithdrawalAdminOut(
            id=w.id,
            requester_user_id=w.requester_user_id,
            pharmacy_id=w.pharmacy_id,
            partner_company_id=w.partner_company_id,
            amount=float(w.amount),
            payout_method=w.payout_method,
            payout_details=coerce_payout_details(w.payout_details),
            status=w.status,
            admin_notes=w.admin_notes,
            processed_by_user_id=w.processed_by_user_id,
            created_at=w.created_at,
            processed_at=w.processed_at,
            payment_reference=w.payment_reference,
            payment_proof_url=w.payment_proof_url,
            requester_name=requester_name,
            requester_email=requester_email,
            seller_name=seller_name,
            seller_kind=seller_kind,
            payout_account=self._payout_account(w.payout_details),
            payout_account_name=self._payout_account_name(w.payout_details),
        )

    async def list_withdrawals_admin(
        self, status: Optional[str] = None
    ) -> list:
        items = await self.list_withdrawals(status=status)
        return [await self.withdrawal_to_admin_out(w) for w in items]

    async def _get_withdrawal(self, withdrawal_id: str) -> WithdrawalRequest:
        result = await self.db.execute(
            select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
        )
        w = result.scalar_one_or_none()
        if not w:
            raise NotFoundError("Withdrawal request", withdrawal_id)
        return w
