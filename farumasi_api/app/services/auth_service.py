from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.constants import UserStatus, UserRole, EntityStatus, VerificationStatus
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    LoginResult,
    RegistrationPendingResponse,
    GoogleOAuthRequest,
)
from app.services.audit_service import AuditService
from app.services.email_verification_service import (
    EmailVerificationService,
    PURPOSE_REGISTRATION,
)

_PUBLIC_REGISTER_ROLES = frozenset({
    UserRole.PATIENT,
    UserRole.RIDER,
})

_PARTNER_PORTAL_LOGIN_ROLES = (
    UserRole.PARTNER_COMPANY_ADMIN,
    UserRole.PHARMACY_ADMIN,
    UserRole.PHARMACIST,
)


def _looks_like_phone(value: str) -> bool:
    value = value.strip()
    if "@" in value:
        return False
    digits = re.sub(r"\D", "", value)
    return len(digits) >= 9


def _normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value.strip())
    if digits.startswith("250"):
        return f"+{digits}"
    if digits.startswith("0") and len(digits) >= 10:
        return f"+250{digits[1:]}"
    if len(digits) == 9:
        return f"+250{digits}"
    return value.strip()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.verify_svc = EmailVerificationService(db)

    async def _find_user_by_identifier(
        self, identifier: str, role: str | None = None
    ) -> User | None:
        ident = identifier.strip()
        if role:
            if _looks_like_phone(ident):
                phone = _normalize_phone(ident)
                user = await self.user_repo.get_by_phone_and_role(phone, role)
                if user:
                    return user
                return await self.user_repo.get_by_phone_and_role(ident, role)
            return await self.user_repo.get_by_email_and_role(ident.lower(), role)

        if _looks_like_phone(ident):
            phone = _normalize_phone(ident)
            user = await self.user_repo.get_by_phone(phone)
            if user:
                return user
            return await self.user_repo.get_by_phone(ident)
        return await self.user_repo.get_by_email(ident.lower())

    async def _resolve_login_user(self, data: LoginRequest) -> User | None:
        ident = data.resolved_identifier()
        portal = (data.portal or "").strip().lower()
        if data.role:
            return await self._find_user_by_identifier(ident, data.role.value)
        if portal == "partner":
            return await self.user_repo.find_by_identifier_and_roles(
                ident,
                [r.value for r in _PARTNER_PORTAL_LOGIN_ROLES],
            )
        if portal == "patient":
            return await self._find_user_by_identifier(ident, UserRole.PATIENT.value)
        return await self._find_user_by_identifier(ident)

    async def register(
        self, data: RegisterRequest, ip_address: str | None = None
    ) -> RegistrationPendingResponse:
        if data.role not in _PUBLIC_REGISTER_ROLES:
            raise ValidationError(
                "Registration is only available for patient and seller business accounts. "
                "Other staff accounts must be created by an administrator."
            )
        role_value = data.role.value
        normalized_phone = _normalize_phone(data.phone) if data.phone else None
        existing = await self.user_repo.get_by_email_and_role(data.email, role_value)
        if existing:
            if existing.status == UserStatus.PENDING_VERIFICATION:
                if not verify_password(data.password, existing.password_hash):
                    raise ConflictError(
                        f"A pending {role_value.replace('_', ' ')} account already uses this email"
                    )
                minutes = await self.verify_svc.send_code(
                    existing,
                    purpose=PURPOSE_REGISTRATION,
                    purpose_label="account registration",
                )
                return RegistrationPendingResponse(
                    message="Verification code resent. Enter it to activate your account.",
                    email=existing.email,
                    expires_minutes=minutes,
                )
            raise ConflictError(
                f"This email is already registered as a {role_value.replace('_', ' ')} account"
            )
        if normalized_phone and await self.user_repo.phone_exists_for_role(
            normalized_phone, role_value
        ):
            raise ConflictError(
                f"This phone is already registered as a {role_value.replace('_', ' ')} account"
            )

        user = await self.user_repo.create(
            full_name=data.full_name,
            email=data.email.lower(),
            phone=normalized_phone,
            password_hash=hash_password(data.password),
            role=data.role,
            status=UserStatus.PENDING_VERIFICATION,
        )

        await self._create_profile(user)

        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_REGISTRATION,
            purpose_label="account registration",
        )

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.register",
            entity_type="User",
            entity_id=user.id,
            new_value={"email": user.email, "role": user.role, "pending_verification": True},
        )

        return RegistrationPendingResponse(
            message="Verification code sent. Enter it to activate your account.",
            email=user.email,
            expires_minutes=minutes,
        )

    async def verify_registration(
        self, email: str, code: str, role: UserRole | None = None
    ) -> TokenResponse:
        user = (
            await self.user_repo.get_by_email_and_role(email, role.value)
            if role
            else await self.user_repo.get_by_email(email)
        )
        if not user:
            raise ValidationError("No account found for that email")
        if user.status == UserStatus.ACTIVE:
            return await self._issue_tokens(user)

        await self.verify_svc.verify_code(
            user, purpose=PURPOSE_REGISTRATION, code=code
        )
        user.status = UserStatus.ACTIVE
        user.email_verified = True
        if user.phone:
            user.phone_verified = True
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.verify_registration",
            entity_type="User",
            entity_id=user.id,
        )
        return await self._issue_tokens(user)

    async def resend_registration_otp(
        self, email: str, role: UserRole | None = None
    ) -> RegistrationPendingResponse:
        user = (
            await self.user_repo.get_by_email_and_role(email, role.value)
            if role
            else await self.user_repo.get_by_email(email)
        )
        if not user:
            raise ValidationError("No account found for that email")
        if user.status == UserStatus.ACTIVE:
            raise ValidationError("Account is already verified. Please sign in.")

        minutes = await self.verify_svc.send_code(
            user,
            purpose=PURPOSE_REGISTRATION,
            purpose_label="account registration",
        )
        return RegistrationPendingResponse(
            message="Verification code resent.",
            email=user.email,
            expires_minutes=minutes,
        )

    async def login(self, data: LoginRequest, ip_address: str | None = None) -> LoginResult:
        ident = data.resolved_identifier()
        user = await self._resolve_login_user(data)

        if not user or not verify_password(data.password, user.password_hash):
            raise AuthenticationError("Invalid email/phone or password")

        if user.status == UserStatus.PENDING_VERIFICATION:
            raise AuthenticationError(
                "Account not verified. Check your email or phone for the verification code."
            )

        if user.status == UserStatus.SUSPENDED:
            raise AuthenticationError("Account suspended. Contact support.")

        if user.status == UserStatus.ARCHIVED:
            raise AuthenticationError("Account no longer active.")

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        if user.two_factor_enabled:
            from app.services.two_factor_service import TwoFactorService

            return await TwoFactorService(self.db).begin_login_challenge(user)

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.login",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )

        tokens = await self._issue_tokens(user)
        return LoginResult(
            requires_2fa=False,
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            token_type=tokens.token_type,
            must_change_password=tokens.must_change_password,
        )

    async def google_oauth(self, data: GoogleOAuthRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            user = await self.user_repo.create(
                full_name=data.full_name,
                email=data.email,
                phone=None,
                password_hash=hash_password(f"oauth-google:{data.google_id or data.email}"),
                role=UserRole.PATIENT,
                status=UserStatus.ACTIVE,
            )
            user.email_verified = True
            await self._create_profile(user)
        elif user.status == UserStatus.PENDING_VERIFICATION:
            user.status = UserStatus.ACTIVE
            user.email_verified = True
            await self.db.flush()

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.login.google",
            entity_type="User",
            entity_id=user.id,
        )
        return await self._issue_tokens(user)

    async def _issue_tokens(self, user: User) -> TokenResponse:
        payload = {"sub": user.id, "role": user.role, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(payload),
            refresh_token=create_refresh_token(payload),
            must_change_password=bool(user.must_change_password),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        from app.core.security import verify_refresh_token
        payload = verify_refresh_token(refresh_token)
        if not payload:
            raise AuthenticationError("Invalid or expired refresh token")

        user = await self.user_repo.get_by_id(payload["sub"])
        if not user:
            raise AuthenticationError("User not found")

        if user.session_invalidated_at is not None:
            iat_raw = payload.get("iat")
            try:
                iat_dt = datetime.fromtimestamp(int(iat_raw), tz=timezone.utc) if iat_raw else None
            except (TypeError, ValueError):
                iat_dt = None
            if iat_dt is None or iat_dt < user.session_invalidated_at:
                raise AuthenticationError("Session expired. Please sign in again.")

        return await self._issue_tokens(user)

    async def _create_profile(self, user: User) -> None:
        """Automatically create role-specific profile after registration."""
        if user.role == UserRole.PATIENT:
            from app.models.patient import PatientProfile

            self.db.add(PatientProfile(user_id=user.id))
        elif user.role == UserRole.DOCTOR:
            from app.models.doctor import DoctorProfile

            self.db.add(DoctorProfile(user_id=user.id))
        elif user.role == UserRole.PHARMACIST:
            from app.models.pharmacist import PharmacistProfile

            self.db.add(PharmacistProfile(user_id=user.id))
        elif user.role == UserRole.RIDER:
            from app.models.rider import RiderProfile

            self.db.add(RiderProfile(user_id=user.id))
        await self.db.flush()
