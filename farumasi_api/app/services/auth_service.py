from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, ConflictError, ValidationError
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.constants import UserStatus, UserRole, EntityStatus
from app.models.user import User
from app.models.patient import PatientProfile
from app.models.doctor import DoctorProfile
from app.models.pharmacist import PharmacistProfile
from app.models.rider import RiderProfile
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.services.audit_service import AuditService

_PUBLIC_REGISTER_ROLES = frozenset({
    UserRole.PATIENT,
    UserRole.PARTNER_COMPANY_ADMIN,
    UserRole.PHARMACY_ADMIN,
})


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, data: RegisterRequest, ip_address: str | None = None) -> TokenResponse:
        if data.role not in _PUBLIC_REGISTER_ROLES:
            raise ValidationError(
                "Registration is only available for patient and seller business accounts. "
                "Other staff accounts must be created by an administrator."
            )
        if await self.user_repo.email_exists(data.email):
            raise ConflictError(f"Email '{data.email}' is already registered")

        user = await self.user_repo.create(
            full_name=data.full_name,
            email=data.email,
            phone=data.phone,
            password_hash=hash_password(data.password),
            role=data.role,
            status=UserStatus.ACTIVE,  # MVP: skip email verification
        )

        # Create role-specific profile automatically
        await self._create_profile(user)

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.register",
            entity_type="User",
            entity_id=user.id,
            new_value={"email": user.email, "role": user.role},
        )

        payload = {"sub": user.id, "role": user.role, "email": user.email}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            must_change_password=bool(user.must_change_password),
        )

    async def login(self, data: LoginRequest, ip_address: str | None = None) -> TokenResponse:
        user = await self.user_repo.get_by_email(data.email)

        if not user or not verify_password(data.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")

        if user.status == UserStatus.SUSPENDED:
            raise AuthenticationError("Account suspended. Contact support.")

        if user.status == UserStatus.ARCHIVED:
            raise AuthenticationError("Account no longer active.")

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        payload = {"sub": user.id, "role": user.role, "email": user.email}
        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        await AuditService(self.db).log(
            actor_user_id=user.id,
            action="user.login",
            entity_type="User",
            entity_id=user.id,
            ip_address=ip_address,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
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

        new_payload = {"sub": user.id, "role": user.role, "email": user.email}
        return TokenResponse(
            access_token=create_access_token(new_payload),
            refresh_token=create_refresh_token(new_payload),
            must_change_password=bool(user.must_change_password),
        )

    async def _create_profile(self, user: User) -> None:
        """Automatically create role-specific profile after registration."""
        if user.role == UserRole.PATIENT:
            self.db.add(PatientProfile(user_id=user.id))
        elif user.role == UserRole.DOCTOR:
            self.db.add(DoctorProfile(user_id=user.id))
        elif user.role == UserRole.PHARMACIST:
            self.db.add(PharmacistProfile(user_id=user.id))
        elif user.role == UserRole.RIDER:
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
