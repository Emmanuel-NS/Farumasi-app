from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import UserRole
from app.core.exceptions import AuthorizationError, BusinessRuleError, NotFoundError
from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy
from app.models.seller_change_request import SellerChangeRequest
from app.models.user import User
from app.schemas.seller_change_request import SellerChangeRequestOut
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class SellerChangeRequestStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


FIELD_LABELS: dict[str, str] = {
    "commission_rate_percent": "Commission rate (%)",
}


class SellerChangeRequestService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def _field_label(field_name: str) -> str:
        return FIELD_LABELS.get(field_name, field_name.replace("_", " ").title())

    @staticmethod
    def _validate_proposed(field_name: str, proposed_value: str) -> str:
        if field_name == "commission_rate_percent":
            try:
                rate = float(proposed_value)
            except ValueError as exc:
                raise BusinessRuleError("Commission rate must be a number") from exc
            if rate < 0 or rate > 100:
                raise BusinessRuleError("Commission rate must be between 0 and 100")
            return f"{rate:.2f}".rstrip("0").rstrip(".")
        return proposed_value.strip()

    async def _get_pharmacy(self, pharmacy_id: str) -> Pharmacy:
        row = await self.db.execute(select(Pharmacy).where(Pharmacy.id == pharmacy_id))
        pharmacy = row.scalar_one_or_none()
        if not pharmacy:
            raise NotFoundError("Pharmacy", pharmacy_id)
        return pharmacy

    async def _get_partner(self, partner_id: str) -> PartnerCompany:
        row = await self.db.execute(
            select(PartnerCompany).where(PartnerCompany.id == partner_id)
        )
        company = row.scalar_one_or_none()
        if not company:
            raise NotFoundError("PartnerCompany", partner_id)
        return company

    async def _cancel_pending_for_field(
        self,
        *,
        field_name: str,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
    ) -> None:
        q = select(SellerChangeRequest).where(
            SellerChangeRequest.status == SellerChangeRequestStatus.PENDING,
            SellerChangeRequest.field_name == field_name,
        )
        if pharmacy_id:
            q = q.where(SellerChangeRequest.pharmacy_id == pharmacy_id)
        if partner_company_id:
            q = q.where(SellerChangeRequest.partner_company_id == partner_company_id)
        pending = list((await self.db.execute(q)).scalars().all())
        for item in pending:
            item.status = SellerChangeRequestStatus.CANCELLED
            item.resolved_at = datetime.now(timezone.utc)

    async def create_for_pharmacy(
        self,
        pharmacy_id: str,
        *,
        field_name: str,
        proposed_value: str,
        admin_note: Optional[str],
        actor: User,
    ) -> SellerChangeRequest:
        if actor.role != UserRole.SUPER_ADMIN:
            raise AuthorizationError("Only super admins can propose seller profile changes")
        pharmacy = await self._get_pharmacy(pharmacy_id)
        normalized = self._validate_proposed(field_name, proposed_value)
        current = (
            str(float(pharmacy.commission_rate_percent))
            if pharmacy.commission_rate_percent is not None
            else None
        )
        if current == normalized:
            raise BusinessRuleError("Proposed value matches the current commission rate")

        await self._cancel_pending_for_field(
            field_name=field_name, pharmacy_id=pharmacy.id
        )
        req = SellerChangeRequest(
            seller_type="pharmacy",
            pharmacy_id=pharmacy.id,
            owner_user_id=pharmacy.owner_user_id,
            requested_by_user_id=actor.id,
            field_name=field_name,
            current_value=current,
            proposed_value=normalized,
            status=SellerChangeRequestStatus.PENDING,
            admin_note=admin_note,
        )
        self.db.add(req)
        await self.db.flush()
        await self._notify_owner_new_request(pharmacy.owner_user_id, pharmacy.name, req)
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="seller_change.requested",
            entity_type="SellerChangeRequest",
            entity_id=req.id,
            new_value={
                "seller": pharmacy.name,
                "field": field_name,
                "proposed": normalized,
            },
        )
        return req

    async def create_for_partner(
        self,
        partner_id: str,
        *,
        field_name: str,
        proposed_value: str,
        admin_note: Optional[str],
        actor: User,
    ) -> SellerChangeRequest:
        if actor.role != UserRole.SUPER_ADMIN:
            raise AuthorizationError("Only super admins can propose seller profile changes")
        company = await self._get_partner(partner_id)
        normalized = self._validate_proposed(field_name, proposed_value)
        current = (
            str(float(company.commission_rate_percent))
            if company.commission_rate_percent is not None
            else None
        )
        if current == normalized:
            raise BusinessRuleError("Proposed value matches the current commission rate")

        await self._cancel_pending_for_field(
            field_name=field_name, partner_company_id=company.id
        )
        req = SellerChangeRequest(
            seller_type="partner_company",
            partner_company_id=company.id,
            owner_user_id=company.owner_user_id,
            requested_by_user_id=actor.id,
            field_name=field_name,
            current_value=current,
            proposed_value=normalized,
            status=SellerChangeRequestStatus.PENDING,
            admin_note=admin_note,
        )
        self.db.add(req)
        await self.db.flush()
        await self._notify_owner_new_request(company.owner_user_id, company.name, req)
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="seller_change.requested",
            entity_type="SellerChangeRequest",
            entity_id=req.id,
            new_value={
                "seller": company.name,
                "field": field_name,
                "proposed": normalized,
            },
        )
        return req

    async def _notify_owner_new_request(
        self, owner_user_id: str, seller_name: str, req: SellerChangeRequest
    ) -> None:
        label = self._field_label(req.field_name)
        try:
            await NotificationService(self.db).send(
                owner_user_id,
                "Profile change needs your approval",
                f"FARUMASI proposed a new {label.lower()} for {seller_name}: "
                f"{req.current_value or '—'} → {req.proposed_value}. "
                "Review in Settings.",
                category="approval",
                action_url="/requests?tab=inbox",
            )
        except Exception:
            pass

    async def list_for_pharmacy(self, pharmacy_id: str) -> list[SellerChangeRequestOut]:
        await self._get_pharmacy(pharmacy_id)
        rows = list(
            (
                await self.db.execute(
                    select(SellerChangeRequest)
                    .options(
                        selectinload(SellerChangeRequest.requested_by),
                        selectinload(SellerChangeRequest.pharmacy),
                    )
                    .where(SellerChangeRequest.pharmacy_id == pharmacy_id)
                    .order_by(SellerChangeRequest.created_at.desc())
                    .limit(20)
                )
            ).scalars().all()
        )
        return [await self._to_out(row) for row in rows]

    async def list_for_partner(self, partner_id: str) -> list[SellerChangeRequestOut]:
        await self._get_partner(partner_id)
        rows = list(
            (
                await self.db.execute(
                    select(SellerChangeRequest)
                    .options(
                        selectinload(SellerChangeRequest.requested_by),
                        selectinload(SellerChangeRequest.partner_company),
                    )
                    .where(SellerChangeRequest.partner_company_id == partner_id)
                    .order_by(SellerChangeRequest.created_at.desc())
                    .limit(20)
                )
            ).scalars().all()
        )
        return [await self._to_out(row) for row in rows]

    async def list_pending_for_owner(self, owner_user_id: str) -> list[SellerChangeRequestOut]:
        rows = list(
            (
                await self.db.execute(
                    select(SellerChangeRequest)
                    .options(
                        selectinload(SellerChangeRequest.requested_by),
                        selectinload(SellerChangeRequest.pharmacy),
                        selectinload(SellerChangeRequest.partner_company),
                    )
                    .where(
                        SellerChangeRequest.owner_user_id == owner_user_id,
                        SellerChangeRequest.status == SellerChangeRequestStatus.PENDING,
                    )
                    .order_by(SellerChangeRequest.created_at.desc())
                )
            ).scalars().all()
        )
        return [await self._to_out(row) for row in rows]

    async def list_all_for_owner(self, owner_user_id: str) -> list[SellerChangeRequestOut]:
        rows = list(
            (
                await self.db.execute(
                    select(SellerChangeRequest)
                    .where(SellerChangeRequest.owner_user_id == owner_user_id)
                    .order_by(SellerChangeRequest.created_at.desc())
                    .limit(50)
                )
            ).scalars().all()
        )
        return [await self._to_out(row) for row in rows]

    async def approve(self, request_id: str, actor: User, partner_note: Optional[str] = None):
        req = await self._get_request(request_id)
        if req.owner_user_id != actor.id and actor.role != UserRole.SUPER_ADMIN:
            raise AuthorizationError("You cannot approve this change request")
        if req.status != SellerChangeRequestStatus.PENDING:
            raise BusinessRuleError(f"Cannot approve request in status '{req.status}'")

        if req.field_name == "commission_rate_percent":
            rate = float(req.proposed_value)
            if req.pharmacy_id:
                pharmacy = await self._get_pharmacy(req.pharmacy_id)
                pharmacy.commission_rate_percent = rate
            elif req.partner_company_id:
                company = await self._get_partner(req.partner_company_id)
                company.commission_rate_percent = rate

        req.status = SellerChangeRequestStatus.APPROVED
        req.partner_note = partner_note
        req.resolved_at = datetime.now(timezone.utc)
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="seller_change.approved",
            entity_type="SellerChangeRequest",
            entity_id=req.id,
        )
        return req

    async def reject(self, request_id: str, actor: User, partner_note: Optional[str] = None):
        req = await self._get_request(request_id)
        if req.owner_user_id != actor.id and actor.role != UserRole.SUPER_ADMIN:
            raise AuthorizationError("You cannot reject this change request")
        if req.status != SellerChangeRequestStatus.PENDING:
            raise BusinessRuleError(f"Cannot reject request in status '{req.status}'")
        req.status = SellerChangeRequestStatus.REJECTED
        req.partner_note = partner_note
        req.resolved_at = datetime.now(timezone.utc)
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="seller_change.rejected",
            entity_type="SellerChangeRequest",
            entity_id=req.id,
        )
        return req

    async def _get_request(self, request_id: str) -> SellerChangeRequest:
        row = await self.db.execute(
            select(SellerChangeRequest).where(SellerChangeRequest.id == request_id)
        )
        req = row.scalar_one_or_none()
        if not req:
            raise NotFoundError("SellerChangeRequest", request_id)
        return req

    async def _to_out(self, req: SellerChangeRequest) -> SellerChangeRequestOut:
        seller_name: Optional[str] = None
        if req.pharmacy_id:
            seller_name = (
                await self.db.execute(
                    select(Pharmacy.name).where(Pharmacy.id == req.pharmacy_id)
                )
            ).scalar_one_or_none()
        elif req.partner_company_id:
            seller_name = (
                await self.db.execute(
                    select(PartnerCompany.name).where(
                        PartnerCompany.id == req.partner_company_id
                    )
                )
            ).scalar_one_or_none()

        requested_by_name = (
            await self.db.execute(
                select(User.full_name).where(User.id == req.requested_by_user_id)
            )
        ).scalar_one_or_none()

        return SellerChangeRequestOut(
            id=req.id,
            seller_type=req.seller_type,
            pharmacy_id=req.pharmacy_id,
            partner_company_id=req.partner_company_id,
            seller_name=seller_name,
            owner_user_id=req.owner_user_id,
            requested_by_user_id=req.requested_by_user_id,
            requested_by_name=requested_by_name,
            field_name=req.field_name,
            field_label=self._field_label(req.field_name),
            current_value=req.current_value,
            proposed_value=req.proposed_value,
            status=req.status,
            admin_note=req.admin_note,
            partner_note=req.partner_note,
            created_at=req.created_at,
            resolved_at=req.resolved_at,
        )
