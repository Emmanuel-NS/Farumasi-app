from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.audit_service import AuditService
from app.services.email_verification_service import (
    EmailVerificationService,
    PURPOSE_PASSWORD_RESET,
)

PURPOSE_PASSWORD_RESET_LABEL = "password reset"


class PasswordResetService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.email_svc = EmailVerificationService(db)

    async def request_reset(self, email: str) -> dict:
        """Send a reset code. Always returns success message to avoid email enumeration."""
        user = await self.user_repo.get_by_email(email.strip())
        if user and user.status not in ("archived", "suspended"):
            await self.email_svc.send_code(
                user,
                purpose=PURPOSE_PASSWORD_RESET,
                purpose_label=PURPOSE_PASSWORD_RESET_LABEL,
            )
            await AuditService(self.db).log(
                actor_user_id=user.id,
                action="user.password_reset.request",
                entity_type="User",
                entity_id=user.id,
            )
        return {
            "status": "ok",
            "message": (
                "If an account exists for that email, a verification code has been sent "
                "by email and/or SMS to your registered phone number."
            ),
        }

    async def reset_password(self, email: str, code: str, new_password: str) -> dict:
        if len(new_password) < 8:
            raise ValidationError("Password must be at least 8 characters")

        user = await self.user_repo.get_by_email(email.strip())
        if not user:
            raise NotFoundError("User", email)

        await self.email_svc.verify_code(user, purpose=PURPOSE_PASSWORD_RESET, code=code)

        user.password_hash = hash_password(new_password)
        user.must_change_password = False
        from datetime import datetime, timezone

        user.session_invalidated_at = datetime.now(timezone.utc)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.password_reset.complete",
            entity_type="User",
            entity_id=user.id,
        )
        return {"status": "ok", "message": "Password updated. You can sign in with your new password."}

    async def admin_force_reset(self, user_id: str, actor: User, *, notify: bool = True) -> dict:
        import secrets
        from datetime import datetime, timezone

        from app.core.constants import UserRole

        if actor.role not in (UserRole.SUPER_ADMIN, UserRole.OPERATIONS_ADMIN):
            from app.core.exceptions import PermissionDenied

            raise PermissionDenied("Only administrators can force password resets")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", user_id)

        temp_password = secrets.token_urlsafe(10)
        user.password_hash = hash_password(temp_password)
        user.must_change_password = True
        user.session_invalidated_at = datetime.now(timezone.utc)
        await self.db.flush()

        await self.email_svc.send_code(
            user,
            purpose=PURPOSE_PASSWORD_RESET,
            purpose_label="administrative password reset",
        )

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="user.password_reset.admin_force",
            entity_type="User",
            entity_id=user.id,
        )

        payload = {
            "status": "ok",
            "message": "Password reset initiated. User must change password on next login.",
            "temporary_password": temp_password if (actor.role == UserRole.SUPER_ADMIN) else None,
        }
        if notify:
            from app.services.notification_service import NotificationService

            await NotificationService(self.db).send(
                user_id=user.id,
                title="Password reset required",
                message="An administrator reset your password. Check your email for a verification code and sign in with your temporary password.",
                category="security",
            )
        return payload
