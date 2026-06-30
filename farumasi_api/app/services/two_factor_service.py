from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.exceptions import AuthenticationError, ValidationError
from app.core.security import (
    create_2fa_pending_token,
    verify_2fa_pending_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginResult, TokenResponse, TwoFactorStatusOut
from app.services.audit_service import AuditService
from app.services.auth_service import AuthService
from app.services.email_verification_service import (
    EmailVerificationService,
    PURPOSE_TWO_FACTOR_DISABLE,
    PURPOSE_TWO_FACTOR_LOGIN,
    PURPOSE_TWO_FACTOR_SETUP,
)

_ADMIN_ROLES = frozenset({
    UserRole.SUPER_ADMIN.value,
    UserRole.FINANCE_ADMIN.value,
    UserRole.OPERATIONS_ADMIN.value,
    UserRole.COMPLIANCE_ADMIN.value,
})


class TwoFactorService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.verify_svc = EmailVerificationService(db)
        self.auth_svc = AuthService(db)

    def _require_admin(self, user: User) -> None:
        if user.role not in _ADMIN_ROLES:
            raise ValidationError("Two-factor authentication is only available for admin accounts.")

    async def status(self, user: User) -> TwoFactorStatusOut:
        return TwoFactorStatusOut(enabled=bool(user.two_factor_enabled), email=user.email)

    async def send_setup_code(self, user: User) -> dict:
        self._require_admin(user)
        if user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is already enabled.")
        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_TWO_FACTOR_SETUP,
            purpose_label="two-factor authentication setup",
        )
        return {"status": "ok", "message": "Verification code sent.", "expires_minutes": minutes}

    async def enable(self, user: User, *, code: str) -> TwoFactorStatusOut:
        self._require_admin(user)
        if user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is already enabled.")
        await self.verify_svc.verify_code(user, purpose=PURPOSE_TWO_FACTOR_SETUP, code=code)
        user.two_factor_enabled = True
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.2fa.enable",
            entity_type="User",
            entity_id=user.id,
        )
        return TwoFactorStatusOut(enabled=True, email=user.email)

    async def send_disable_code(self, user: User) -> dict:
        self._require_admin(user)
        if not user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is not enabled.")
        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_TWO_FACTOR_DISABLE,
            purpose_label="two-factor authentication disable",
        )
        return {"status": "ok", "message": "Verification code sent.", "expires_minutes": minutes}

    async def disable(self, user: User, *, password: str, code: str) -> TwoFactorStatusOut:
        self._require_admin(user)
        if not user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is not enabled.")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("Password is incorrect.")
        await self.verify_svc.verify_code(user, purpose=PURPOSE_TWO_FACTOR_DISABLE, code=code)
        user.two_factor_enabled = False
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.2fa.disable",
            entity_type="User",
            entity_id=user.id,
        )
        return TwoFactorStatusOut(enabled=False, email=user.email)

    async def begin_login_challenge(self, user: User) -> LoginResult:
        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_TWO_FACTOR_LOGIN,
            purpose_label="admin sign-in verification",
        )
        pending = create_2fa_pending_token(user.id, expires_minutes=minutes)
        masked = user.email
        if "@" in masked:
            local, domain = masked.split("@", 1)
            masked = f"{local[:2]}***@{domain}"
        return LoginResult(
            requires_2fa=True,
            pending_token=pending,
            expires_minutes=minutes,
            message=f"Enter the verification code sent to {masked}.",
        )

    async def resend_login_code(self, pending_token: str) -> dict:
        user = await self._user_from_pending(pending_token)
        if not user.two_factor_enabled:
            raise ValidationError("Two-factor authentication is not enabled for this account.")
        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_TWO_FACTOR_LOGIN,
            purpose_label="admin sign-in verification",
        )
        return {"status": "ok", "message": "Verification code resent.", "expires_minutes": minutes}

    async def verify_login(self, pending_token: str, code: str, *, ip_address: str | None = None) -> TokenResponse:
        user = await self._user_from_pending(pending_token)
        await self.verify_svc.verify_code(user, purpose=PURPOSE_TWO_FACTOR_LOGIN, code=code)
        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.login.2fa",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )
        return await self.auth_svc._issue_tokens(user)

    async def _user_from_pending(self, pending_token: str) -> User:
        payload = verify_2fa_pending_token(pending_token)
        if not payload or not payload.get("sub"):
            raise AuthenticationError("Sign-in session expired. Please sign in again.")
        user = await self.user_repo.get_by_id(payload["sub"])
        if not user:
            raise AuthenticationError("User not found.")
        return user
