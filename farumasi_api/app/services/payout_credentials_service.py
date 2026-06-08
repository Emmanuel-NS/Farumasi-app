from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ValidationError
from app.models.owner_payout_profile import OwnerPayoutProfile
from app.models.user import User
from app.schemas.revenue import (
    payout_account_from_details,
    payout_account_name_from_details,
)
from app.schemas.seller_payout import PayoutCredentialsIn, PayoutCredentialsOut
from app.services.audit_service import AuditService
from app.services.email_verification_service import (
    EmailVerificationService,
    PURPOSE_PAYOUT_CREDENTIALS,
)


def mask_account(account: str) -> str:
    raw = account.strip()
    if len(raw) <= 4:
        return "****"
    if len(raw) <= 8:
        return f"{'*' * (len(raw) - 2)}{raw[-2:]}"
    return f"{raw[:2]}{'*' * (len(raw) - 6)}{raw[-4:]}"


class PayoutCredentialsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_profile(self, owner_user_id: str) -> Optional[OwnerPayoutProfile]:
        result = await self.db.execute(
            select(OwnerPayoutProfile).where(
                OwnerPayoutProfile.owner_user_id == owner_user_id
            )
        )
        return result.scalar_one_or_none()

    def _to_out(self, profile: Optional[OwnerPayoutProfile]) -> PayoutCredentialsOut:
        if not profile:
            return PayoutCredentialsOut(configured=False)
        account = payout_account_from_details(profile.payout_details) or ""
        name = payout_account_name_from_details(profile.payout_details)
        return PayoutCredentialsOut(
            configured=True,
            payout_method=profile.payout_method,
            payout_account_masked=mask_account(account) if account else None,
            payout_account_name=name,
            updated_at=profile.updated_at.isoformat() if profile.updated_at else None,
        )

    async def get_for_owner(self, owner_user_id: str) -> PayoutCredentialsOut:
        return self._to_out(await self._get_profile(owner_user_id))

    async def get_required_profile(self, owner_user_id: str) -> OwnerPayoutProfile:
        profile = await self._get_profile(owner_user_id)
        if not profile:
            raise BusinessRuleError(
                "Payout credentials are not configured. "
                "Add your bank or mobile money details in Business Profile before withdrawing."
            )
        return profile

    async def send_update_verification(self, actor: User) -> int:
        existing = await self._get_profile(actor.id)
        if not existing:
            raise ValidationError(
                "Set payout credentials first during registration or in Business Profile."
            )
        minutes = await EmailVerificationService(self.db).send_code(
            actor,
            purpose=PURPOSE_PAYOUT_CREDENTIALS,
            purpose_label="payout account change",
        )
        await self.db.commit()
        return minutes

    async def set_credentials(
        self, actor: User, data: PayoutCredentialsIn
    ) -> PayoutCredentialsOut:
        existing = await self._get_profile(actor.id)
        if existing:
            if not data.verification_code:
                raise ValidationError(
                    "Email verification code is required to change payout credentials. "
                    "Request a code sent to your owner email first."
                )
            await EmailVerificationService(self.db).verify_code(
                actor,
                purpose=PURPOSE_PAYOUT_CREDENTIALS,
                code=data.verification_code,
            )

        if existing:
            existing.payout_method = data.payout_method
            existing.payout_details = data.payout_details
            profile = existing
        else:
            profile = OwnerPayoutProfile(
                owner_user_id=actor.id,
                payout_method=data.payout_method,
                payout_details=data.payout_details,
            )
            self.db.add(profile)

        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="seller.payout_credentials_updated",
            entity_type="OwnerPayoutProfile",
            entity_id=profile.id,
            new_value={
                "payout_method": data.payout_method,
                "account_masked": mask_account(
                    payout_account_from_details(data.payout_details) or ""
                ),
            },
        )
        await self.db.commit()
        await self.db.refresh(profile)
        return self._to_out(profile)
