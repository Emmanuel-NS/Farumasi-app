from __future__ import annotations

from pydantic import EmailStr, Field, field_validator

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
    email: EmailStr
    password: str


class RefreshRequest(FarumasiBaseModel):
    refresh_token: str


class TokenResponse(FarumasiBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class ForgotPasswordRequest(FarumasiBaseModel):
    email: EmailStr


class ResetPasswordRequest(FarumasiBaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)


class AccessTokenResponse(FarumasiBaseModel):
    access_token: str
    token_type: str = "bearer"
