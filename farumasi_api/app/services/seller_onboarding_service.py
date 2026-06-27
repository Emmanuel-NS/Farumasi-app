"""Pharmacist-initiated seller drafts (no owner account — public application completes onboarding)."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import EntityStatus, VerificationStatus
from app.core.exceptions import AuthorizationError
from app.models.partner import PartnerCompany
from app.models.pharmacist import PharmacistProfile
from app.models.pharmacy import Pharmacy
from app.models.user import User
from app.schemas.seller_onboarding import (
    DraftPartnerOnboardRequest,
    DraftPharmacyOnboardRequest,
    DraftSellerOut,
)
from app.services.audit_service import AuditService
from app.utils.partner_profile import partner_profile_complete
from app.utils.pharmacy_profile import pharmacy_profile_complete


class SellerOnboardingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _pharmacist_profile_id(self, actor: User) -> str:
        if actor.role.value != "pharmacist":
            raise AuthorizationError("Only FARUMASI pharmacists can draft seller onboarding")
        from sqlalchemy import select

        result = await self.db.execute(
            select(PharmacistProfile.id).where(PharmacistProfile.user_id == actor.id)
        )
        pid = result.scalar_one_or_none()
        if not pid:
            raise AuthorizationError("Pharmacist profile not found")
        return pid

    async def draft_pharmacy(
        self, data: DraftPharmacyOnboardRequest, actor: User
    ) -> DraftSellerOut:
        pharmacist_id = await self._pharmacist_profile_id(actor)
        pharmacy = Pharmacy(
            owner_user_id=None,
            name=data.name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            district=data.district,
            latitude=data.latitude,
            longitude=data.longitude,
            license_number=data.license_number,
            license_document_url=data.license_document_url,
            supervising_pharmacist_name=data.supervising_pharmacist_name,
            supervising_pharmacist_license=data.supervising_pharmacist_license,
            accepts_delivery=data.accepts_delivery,
            status=EntityStatus.INACTIVE,
            verification_status=VerificationStatus.PENDING,
            drafted_by_pharmacist_id=pharmacist_id,
        )
        self.db.add(pharmacy)
        await self.db.flush()
        pharmacy.onboarding_completed = pharmacy_profile_complete(pharmacy)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="pharmacist.pharmacy.draft",
            entity_type="Pharmacy",
            entity_id=pharmacy.id,
            new_value={"name": pharmacy.name},
        )
        await self.db.commit()
        return DraftSellerOut(pharmacy_id=pharmacy.id, name=pharmacy.name)

    async def draft_partner(
        self, data: DraftPartnerOnboardRequest, actor: User
    ) -> DraftSellerOut:
        pharmacist_id = await self._pharmacist_profile_id(actor)
        company = PartnerCompany(
            owner_user_id=None,
            name=data.name,
            company_type=data.company_type,
            email=data.email,
            phone=data.phone,
            address=data.address,
            district=data.district,
            latitude=data.latitude,
            longitude=data.longitude,
            business_registration_number=data.business_registration_number,
            regulatory_authority=data.regulatory_authority,
            regulatory_license_number=data.regulatory_license_number,
            regulatory_license_document_url=data.regulatory_license_document_url,
            description=data.description,
            commission_rate_percent=10.0,
            status=EntityStatus.INACTIVE,
            verification_status=VerificationStatus.PENDING,
            drafted_by_pharmacist_id=pharmacist_id,
        )
        self.db.add(company)
        await self.db.flush()
        company.onboarding_completed = partner_profile_complete(company)

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="pharmacist.partner.draft",
            entity_type="PartnerCompany",
            entity_id=company.id,
            new_value={"name": company.name},
        )
        await self.db.commit()
        return DraftSellerOut(partner_company_id=company.id, name=company.name)
