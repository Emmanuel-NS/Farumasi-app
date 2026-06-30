from __future__ import annotations

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import UserRole


class RegisterRequest(FarumasiBaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password: str
    role: UserRole = UserRole.PATIENT

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(FarumasiBaseModel):
    """Sign in with email or phone. `identifier` is preferred; `email` kept for older clients."""

    identifier: str | None = Field(None, description="Email address or phone number")
    email: EmailStr | None = None
    password: str
    role: UserRole | None = Field(
        None,
        description="Restrict sign-in to this account role (e.g. patient vs partner).",
    )
    portal: str | None = Field(
        None,
        description="Portal hint: 'patient' or 'partner' when the same email exists on multiple roles.",
    )

    @model_validator(mode="after")
    def require_identifier(self) -> "LoginRequest":
        if not (self.identifier or self.email):
            raise ValueError("Email or phone is required")
        return self

    def resolved_identifier(self) -> str:
        return (self.identifier or str(self.email or "")).strip()


class VerifyRegistrationRequest(FarumasiBaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    role: UserRole | None = None


class ResendRegistrationOtpRequest(FarumasiBaseModel):
    email: EmailStr
    role: UserRole | None = None


class RegistrationPendingResponse(FarumasiBaseModel):
    message: str
    email: str
    expires_minutes: int
    requires_verification: bool = True


class GoogleOAuthRequest(FarumasiBaseModel):
    email: EmailStr
    full_name: str
    google_id: str | None = None


class RefreshRequest(FarumasiBaseModel):
    refresh_token: str


class TokenResponse(FarumasiBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class LoginResult(FarumasiBaseModel):
    """Login response — tokens when complete, or a 2FA challenge when enabled."""

    requires_2fa: bool = False
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    must_change_password: bool = False
    pending_token: str | None = None
    expires_minutes: int | None = None
    message: str | None = None


class TwoFactorCodeRequest(FarumasiBaseModel):
    code: str = Field(min_length=4, max_length=12)


class TwoFactorDisableRequest(FarumasiBaseModel):
    password: str
    code: str = Field(min_length=4, max_length=12)


class TwoFactorLoginVerifyRequest(FarumasiBaseModel):
    pending_token: str
    code: str = Field(min_length=4, max_length=12)


class TwoFactorResendLoginRequest(FarumasiBaseModel):
    pending_token: str


class TwoFactorStatusOut(FarumasiBaseModel):
    enabled: bool
    email: str


class ForgotPasswordRequest(FarumasiBaseModel):
    email: EmailStr


class ResetPasswordRequest(FarumasiBaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)


class AccessTokenResponse(FarumasiBaseModel):
    access_token: str
    token_type: str = "bearer"
