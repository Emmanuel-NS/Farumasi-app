from __future__ import annotations

import re
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.constants import UserStatus, UserRole, EntityStatus
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
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
    UserRole.PARTNER_COMPANY_ADMIN,
    UserRole.PHARMACY_ADMIN,
    UserRole.RIDER,
})


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

    async def _find_user_by_identifier(self, identifier: str) -> User | None:
        ident = identifier.strip()
        if _looks_like_phone(ident):
            phone = _normalize_phone(ident)
            user = await self.user_repo.get_by_phone(phone)
            if user:
                return user
            return await self.user_repo.get_by_phone(ident)
        return await self.user_repo.get_by_email(ident.lower())

    async def register(
        self, data: RegisterRequest, ip_address: str | None = None
    ) -> RegistrationPendingResponse:
        if data.role not in _PUBLIC_REGISTER_ROLES:
            raise ValidationError(
                "Registration is only available for patient and seller business accounts. "
                "Other staff accounts must be created by an administrator."
            )
        if await self.user_repo.email_exists(data.email):
            raise ConflictError(f"Email '{data.email}' is already registered")
        if data.phone and await self.user_repo.phone_exists(data.phone):
            raise ConflictError(f"Phone '{data.phone}' is already registered")

        user = await self.user_repo.create(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
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

    async def verify_registration(self, email: str, code: str) -> TokenResponse:
        user = await self.user_repo.get_by_email(email)
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

    async def resend_registration_otp(self, email: str) -> RegistrationPendingResponse:
        user = await self.user_repo.get_by_email(email)
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

    async def login(self, data: LoginRequest, ip_address: str | None = None) -> TokenResponse:
        ident = data.resolved_identifier()
        user = await self._find_user_by_identifier(ident)

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

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.login",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )

        return await self._issue_tokens(user)

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
        elif user.role == UserRole.PARTNER_COMPANY_ADMIN:
            from app.models.partner import PartnerCompany

            self.db.add(
                PartnerCompany(
                    owner_user_id=user.id,
                    name=f"{user.full_name}'s Company",
                    email=user.email,
                    phone=user.phone,
                    status=EntityStatus.PENDING,
                )
            )
        elif user.role == UserRole.PHARMACY_ADMIN:
            from app.models.pharmacy import Pharmacy

            self.db.add(
                Pharmacy(
                    owner_user_id=user.id,
                    name=f"{user.full_name}'s Pharmacy",
                    email=user.email,
                    phone=user.phone,
                    status=EntityStatus.PENDING,
                )
            )
        await self.db.flush()
