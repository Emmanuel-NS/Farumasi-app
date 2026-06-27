"""Public seller applications — separate from pharmacist drafts until approval."""
from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import (
    EntityStatus,
    SellerApplicationStatus,
    UserRole,
    UserStatus,
    VerificationStatus,
)
from app.core.exceptions import AuthorizationError, BusinessRuleError, ConflictError, NotFoundError, ValidationError
from app.core.security import hash_password
from app.models.owner_payout_profile import OwnerPayoutProfile
from app.models.partner import PartnerCompany
from app.models.pharmacy import Pharmacy
from app.models.seller_application import SellerApplication
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.seller_application import (
    SellerApplicationOut,
    SellerApplicationSubmit,
    SellerApplicationSubmitResponse,
    SellerApplicationVerifyRequest,
    SellerDraftPartnerOut,
    SellerDraftPharmacyOut,
)
from app.services.audit_service import AuditService
from app.services.email_verification_service import EmailVerificationService, PURPOSE_REGISTRATION
from app.utils.partner_profile import partner_profile_complete
from app.utils.pharmacy_profile import pharmacy_profile_complete


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _application_code() -> str:
    return "APP-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


_ACTIVE_APPLICATION_STATUSES = (
    SellerApplicationStatus.SUBMITTED.value,
    SellerApplicationStatus.UNDER_REVIEW.value,
)


class SellerApplicationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)
        self.verify_svc = EmailVerificationService(db)

    async def list_pharmacy_drafts(self) -> list[SellerDraftPharmacyOut]:
        busy = select(SellerApplication.source_pharmacy_id).where(
            SellerApplication.source_pharmacy_id.isnot(None),
            SellerApplication.status.in_(_ACTIVE_APPLICATION_STATUSES),
        )
        rows = (
            await self.db.execute(
                select(Pharmacy)
                .where(
                    Pharmacy.drafted_by_pharmacist_id.isnot(None),
                    Pharmacy.owner_user_id.is_(None),
                    Pharmacy.verification_status == VerificationStatus.PENDING,
                    Pharmacy.id.notin_(busy),
                )
                .order_by(Pharmacy.name)
            )
        ).scalars().all()
        return [SellerDraftPharmacyOut.model_validate(p) for p in rows]

    async def list_partner_drafts(self) -> list[SellerDraftPartnerOut]:
        busy = select(SellerApplication.source_partner_id).where(
            SellerApplication.source_partner_id.isnot(None),
            SellerApplication.status.in_(_ACTIVE_APPLICATION_STATUSES),
        )
        rows = (
            await self.db.execute(
                select(PartnerCompany)
                .where(
                    PartnerCompany.drafted_by_pharmacist_id.isnot(None),
                    PartnerCompany.owner_user_id.is_(None),
                    PartnerCompany.verification_status == VerificationStatus.PENDING,
                    PartnerCompany.id.notin_(busy),
                )
                .order_by(PartnerCompany.name)
            )
        ).scalars().all()
        return [SellerDraftPartnerOut.model_validate(p) for p in rows]

    async def submit(self, data: SellerApplicationSubmit) -> SellerApplicationSubmitResponse:
        role = UserRole.PHARMACY_ADMIN if data.seller_type == "pharmacy" else UserRole.PARTNER_COMPANY_ADMIN
        if await self.user_repo.email_exists_for_role(data.owner_email, role.value):
            raise ConflictError(
                f"Email '{data.owner_email}' is already registered. Sign in or use a different email."
            )

        if data.seller_type == "pharmacy":
            if data.source_partner_id:
                raise ValidationError("source_partner_id is not valid for pharmacy applications")
            if data.source_pharmacy_id:
                await self._assert_pharmacy_draft_available(data.source_pharmacy_id)
        else:
            if data.source_pharmacy_id:
                raise ValidationError("source_pharmacy_id is not valid for partner applications")
            if data.source_partner_id:
                await self._assert_partner_draft_available(data.source_partner_id)

        user = await self.user_repo.create(
            full_name=data.owner_full_name.strip(),
            email=data.owner_email.lower(),
            phone=data.owner_phone,
            password_hash=hash_password(data.password),
            role=role,
            status=UserStatus.PENDING_VERIFICATION,
        )

        application = SellerApplication(
            application_code=_application_code(),
            seller_type=data.seller_type,
            status=SellerApplicationStatus.SUBMITTED.value,
            source_pharmacy_id=data.source_pharmacy_id,
            source_partner_id=data.source_partner_id,
            applicant_user_id=user.id,
            business_name=data.business_name.strip(),
            owner_full_name=data.owner_full_name.strip(),
            owner_email=data.owner_email.lower(),
            owner_phone=data.owner_phone,
            district=(data.payload.get("district") or None),
            payload=data.payload,
            submitted_at=_now(),
        )
        self.db.add(application)
        await self.db.flush()

        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_REGISTRATION,
            purpose_label="seller application",
        )

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="seller_application.submit",
            entity_type="SellerApplication",
            entity_id=application.id,
            new_value={
                "application_code": application.application_code,
                "seller_type": application.seller_type,
                "source_pharmacy_id": application.source_pharmacy_id,
                "source_partner_id": application.source_partner_id,
            },
        )
        await self.db.commit()

        return SellerApplicationSubmitResponse(
            message="Verification code sent. Enter it to confirm your application.",
            application_id=application.id,
            application_code=application.application_code,
            email=user.email,
            expires_minutes=minutes,
        )

    async def verify(self, data: SellerApplicationVerifyRequest) -> TokenResponse:
        application = await self._get_application_or_404(data.application_id)
        if application.owner_email.lower() != data.email.lower():
            raise ValidationError("Email does not match this application")

        user = await self.user_repo.get_by_id(application.applicant_user_id or "")
        if not user:
            raise NotFoundError("User", application.applicant_user_id or "")

        await self.verify_svc.verify_code(user, purpose=PURPOSE_REGISTRATION, code=data.code)
        user.status = UserStatus.ACTIVE
        user.email_verified = True
        if user.phone:
            user.phone_verified = True
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="seller_application.verify",
            entity_type="SellerApplication",
            entity_id=application.id,
        )
        await self.db.commit()

        from app.services.auth_service import AuthService

        return await AuthService(self.db)._issue_tokens(user)

    async def get_my_application(self, user: User) -> SellerApplicationOut | None:
        row = (
            await self.db.execute(
                select(SellerApplication)
                .where(SellerApplication.applicant_user_id == user.id)
                .order_by(SellerApplication.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if not row:
            return None
        return SellerApplicationOut.model_validate(row)

    async def list_applications(
        self,
        *,
        status: str | None = None,
        seller_type: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[SellerApplicationOut], int]:
        q = select(SellerApplication)
        if status:
            q = q.where(SellerApplication.status == status)
        if seller_type:
            q = q.where(SellerApplication.seller_type == seller_type)
        total = (
            await self.db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        rows = (
            await self.db.execute(
                q.order_by(SellerApplication.submitted_at.desc().nullslast())
                .offset(offset)
                .limit(limit)
            )
        ).scalars().all()
        return [SellerApplicationOut.model_validate(r) for r in rows], int(total)

    async def review(
        self, application_id: str, *, status: str, review_notes: str | None, actor: User
    ) -> SellerApplicationOut:
        if actor.role not in (
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.COMPLIANCE_ADMIN,
            UserRole.PHARMACIST,
        ):
            raise AuthorizationError("Not allowed to review seller applications")

        application = await self._get_application_or_404(application_id)
        if application.status in (
            SellerApplicationStatus.APPROVED.value,
            SellerApplicationStatus.REJECTED.value,
        ):
            raise BusinessRuleError("Application has already been finalised")

        application.review_notes = review_notes
        application.reviewed_by_user_id = actor.id
        application.reviewed_at = _now()

        if status == SellerApplicationStatus.APPROVED.value:
            await self._approve(application)
            application.status = SellerApplicationStatus.APPROVED.value
        elif status == SellerApplicationStatus.REJECTED.value:
            application.status = SellerApplicationStatus.REJECTED.value
        else:
            application.status = SellerApplicationStatus.UNDER_REVIEW.value

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action=f"seller_application.{status}",
            entity_type="SellerApplication",
            entity_id=application.id,
            new_value={"status": application.status, "review_notes": review_notes},
        )
        await self.db.commit()
        await self.db.refresh(application)
        return SellerApplicationOut.model_validate(application)

    async def _approve(self, application: SellerApplication) -> None:
        user = await self.user_repo.get_by_id(application.applicant_user_id or "")
        if not user:
            raise NotFoundError("User", application.applicant_user_id or "")

        payload = application.payload or {}
        if application.seller_type == "pharmacy":
            pharmacy = await self._resolve_pharmacy_for_approval(application, payload)
            pharmacy.owner_user_id = user.id
            pharmacy.name = application.business_name
            pharmacy.email = payload.get("email") or application.owner_email
            pharmacy.phone = payload.get("phone") or application.owner_phone
            pharmacy.address = payload.get("address")
            pharmacy.district = payload.get("district") or application.district
            pharmacy.latitude = payload.get("latitude")
            pharmacy.longitude = payload.get("longitude")
            pharmacy.license_number = payload.get("license_number")
            pharmacy.license_document_url = payload.get("license_document_url")
            pharmacy.supervising_pharmacist_name = payload.get("supervising_pharmacist_name")
            pharmacy.supervising_pharmacist_license = payload.get("supervising_pharmacist_license")
            pharmacy.logo_url = payload.get("logo_url")
            pharmacy.accepts_delivery = bool(payload.get("accepts_delivery", True))
            pharmacy.status = EntityStatus.ACTIVE
            pharmacy.verification_status = VerificationStatus.VERIFIED
            pharmacy.onboarding_completed = pharmacy_profile_complete(pharmacy)
            application.approved_pharmacy_id = pharmacy.id
        else:
            company = await self._resolve_partner_for_approval(application, payload)
            company.owner_user_id = user.id
            company.name = application.business_name
            company.email = payload.get("email") or application.owner_email
            company.phone = payload.get("phone") or application.owner_phone
            company.address = payload.get("address")
            company.district = payload.get("district") or application.district
            company.latitude = payload.get("latitude")
            company.longitude = payload.get("longitude")
            company.company_type = payload.get("company_type")
            company.business_registration_number = payload.get("business_registration_number")
            company.regulatory_authority = payload.get("regulatory_authority")
            company.regulatory_license_number = payload.get("regulatory_license_number")
            company.regulatory_license_document_url = payload.get("regulatory_license_document_url")
            company.logo_url = payload.get("logo_url")
            company.description = payload.get("description")
            company.status = EntityStatus.ACTIVE
            company.verification_status = VerificationStatus.VERIFIED
            company.onboarding_completed = partner_profile_complete(company)
            application.approved_partner_id = company.id

        payout_method = payload.get("payout_method")
        payout_details = payload.get("payout_details")
        if payout_method and isinstance(payout_details, dict) and payout_details:
            existing_payout = (
                await self.db.execute(
                    select(OwnerPayoutProfile).where(OwnerPayoutProfile.owner_user_id == user.id)
                )
            ).scalar_one_or_none()
            if not existing_payout:
                self.db.add(
                    OwnerPayoutProfile(
                        owner_user_id=user.id,
                        payout_method=str(payout_method),
                        payout_details=payout_details,
                    )
                )

    async def _resolve_pharmacy_for_approval(
        self, application: SellerApplication, payload: dict
    ) -> Pharmacy:
        if application.source_pharmacy_id:
            pharmacy = await self.db.get(Pharmacy, application.source_pharmacy_id)
            if not pharmacy:
                raise NotFoundError("Pharmacy", application.source_pharmacy_id)
            return pharmacy
        pharmacy = Pharmacy(
            name=application.business_name,
            status=EntityStatus.INACTIVE,
            verification_status=VerificationStatus.PENDING,
        )
        self.db.add(pharmacy)
        await self.db.flush()
        return pharmacy

    async def _resolve_partner_for_approval(
        self, application: SellerApplication, payload: dict
    ) -> PartnerCompany:
        if application.source_partner_id:
            company = await self.db.get(PartnerCompany, application.source_partner_id)
            if not company:
                raise NotFoundError("PartnerCompany", application.source_partner_id)
            return company
        company = PartnerCompany(
            name=application.business_name,
            commission_rate_percent=float(payload.get("commission_rate_percent") or 10.0),
            status=EntityStatus.INACTIVE,
            verification_status=VerificationStatus.PENDING,
        )
        self.db.add(company)
        await self.db.flush()
        return company

    async def _assert_pharmacy_draft_available(self, pharmacy_id: str) -> Pharmacy:
        pharmacy = await self.db.get(Pharmacy, pharmacy_id)
        if not pharmacy or not pharmacy.drafted_by_pharmacist_id or pharmacy.owner_user_id:
            raise ValidationError("Selected pharmacy draft is not available")
        existing = (
            await self.db.execute(
                select(SellerApplication.id).where(
                    SellerApplication.source_pharmacy_id == pharmacy_id,
                    SellerApplication.status.in_(_ACTIVE_APPLICATION_STATUSES),
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise ConflictError("An application is already in progress for this pharmacy draft")
        return pharmacy

    async def _assert_partner_draft_available(self, partner_id: str) -> PartnerCompany:
        company = await self.db.get(PartnerCompany, partner_id)
        if not company or not company.drafted_by_pharmacist_id or company.owner_user_id:
            raise ValidationError("Selected partner draft is not available")
        existing = (
            await self.db.execute(
                select(SellerApplication.id).where(
                    SellerApplication.source_partner_id == partner_id,
                    SellerApplication.status.in_(_ACTIVE_APPLICATION_STATUSES),
                )
            )
        ).scalar_one_or_none()
        if existing:
            raise ConflictError("An application is already in progress for this partner draft")
        return company

    async def _get_application_or_404(self, application_id: str) -> SellerApplication:
        row = await self.db.get(SellerApplication, application_id)
        if not row:
            raise NotFoundError("SellerApplication", application_id)
        return row
