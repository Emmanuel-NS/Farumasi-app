from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthorizationError, ValidationError
from app.core.security import hash_password, verify_password
from app.models.email_verification_challenge import EmailVerificationChallenge
from app.models.user import User
from app.services.email_delivery_service import (
    send_owner_verification_email,
    email_config_issue,
)
from app.services.sms_delivery_service import send_verification_sms

PURPOSE_PAYOUT_CREDENTIALS = "payout_credentials_update"
PURPOSE_PASSWORD_RESET = "password_reset"
PURPOSE_REGISTRATION = "registration"

logger = logging.getLogger(__name__)


class EmailVerificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_code(
        self,
        user: User,
        *,
        purpose: str,
        purpose_label: str,
    ) -> int:
        code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
        )

        await self.db.execute(
            update(EmailVerificationChallenge)
            .where(
                EmailVerificationChallenge.user_id == user.id,
                EmailVerificationChallenge.purpose == purpose,
                EmailVerificationChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=datetime.now(timezone.utc))
        )

        self.db.add(
            EmailVerificationChallenge(
                user_id=user.id,
                purpose=purpose,
                code_hash=hash_password(code),
                expires_at=expires_at,
            )
        )
        await self.db.flush()

        email_sent = send_owner_verification_email(
            to_email=user.email,
            full_name=user.full_name,
            code=code,
            purpose_label=purpose_label,
        )

        sms_sent = False
        if user.phone and (not email_sent or purpose == PURPOSE_PASSWORD_RESET):
            sms_sent = send_verification_sms(
                phone=user.phone,
                code=code,
                purpose_label=purpose_label,
                lang=getattr(user, "preferred_language", None),
            )

        env = (settings.ENVIRONMENT or "").lower()
        if not email_sent and not sms_sent:
            if env == "development":
                logger.warning(
                    "Verification delivery skipped (no SMTP/SMS) — %s (%s): %s",
                    user.email,
                    purpose_label,
                    code,
                )
            else:
                config_issue = email_config_issue()
                if config_issue:
                    raise ValidationError(
                        f"Verification code could not be sent: {config_issue}"
                    )
                raise ValidationError(
                    "Verification code could not be sent. "
                    "Check Brevo: set BREVO_API_KEY, verify SMTP_FROM_EMAIL as a sender, "
                    "and confirm the API key can send transactional email."
                )
        return settings.EMAIL_VERIFICATION_EXPIRE_MINUTES

    async def verify_code(self, user: User, *, purpose: str, code: str) -> None:
        if not code or len(code.strip()) < 4:
            raise ValidationError("Verification code is required")

        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(EmailVerificationChallenge)
            .where(
                EmailVerificationChallenge.user_id == user.id,
                EmailVerificationChallenge.purpose == purpose,
                EmailVerificationChallenge.consumed_at.is_(None),
            )
            .order_by(EmailVerificationChallenge.created_at.desc())
            .limit(1)
        )
        challenge = result.scalar_one_or_none()
        if not challenge:
            raise ValidationError("No active verification code. Request a new one.")
        if challenge.expires_at < now:
            raise ValidationError("Verification code expired. Request a new one.")
        if not verify_password(code.strip(), challenge.code_hash):
            raise AuthorizationError("Invalid verification code")

        challenge.consumed_at = now
        await self.db.flush()
