from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import EmailStr, Field

from app.schemas.common import FarumasiBaseModel
from app.core.constants import UserRole, UserStatus


# ── Notification preferences ────────────────────────────────────────────────
class NotificationChannels(FarumasiBaseModel):
    push: bool = True
    email: bool = True
    sms: bool = False
    whatsapp: bool = False


class NotificationEvents(FarumasiBaseModel):
    orders: bool = True
    health_tips: bool = True
    promotions: bool = False
    app_updates: bool = True
    reminders: bool = True


class NotificationPreferences(FarumasiBaseModel):
    channels: NotificationChannels = Field(default_factory=NotificationChannels)
    events: NotificationEvents = Field(default_factory=NotificationEvents)


DEFAULT_NOTIFICATION_PREFERENCES = NotificationPreferences()


class UserOut(FarumasiBaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str
    profile_image_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime
    two_factor_enabled: bool = False
    email_verified: bool = False
    phone_verified: bool = False
    must_change_password: bool = False
    preferred_language: str = "en"


class UserUpdateRequest(FarumasiBaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None
    preferred_language: Optional[Literal["en", "rw", "fr", "sw"]] = None


class UserStatusUpdate(FarumasiBaseModel):
    status: UserStatus
    reason: Optional[str] = None


class CurrentUserOut(UserOut):
    """Extended view for /auth/me — includes role-specific profile pointers."""
    pass


class ChangePasswordRequest(FarumasiBaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)


class DeleteAccountRequest(FarumasiBaseModel):
    password: str = Field(min_length=1)
    reason: Optional[str] = None


class PinSetRequest(FarumasiBaseModel):
    pin: str = Field(min_length=4, max_length=8)


class PinVerifyRequest(FarumasiBaseModel):
    pin: str = Field(min_length=4, max_length=8)


class PinChangeRequest(FarumasiBaseModel):
    current_pin: str = Field(min_length=4, max_length=8)
    new_pin: str = Field(min_length=4, max_length=8)


# Aliases used by endpoints
UserUpdate = UserUpdateRequest

