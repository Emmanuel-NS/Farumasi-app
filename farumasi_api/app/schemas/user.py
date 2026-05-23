from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import EmailStr

from app.schemas.common import FarumasiBaseModel
from app.core.constants import UserRole, UserStatus


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


class UserUpdateRequest(FarumasiBaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_image_url: Optional[str] = None


class UserStatusUpdate(FarumasiBaseModel):
    status: UserStatus
    reason: Optional[str] = None


class CurrentUserOut(UserOut):
    """Extended view for /auth/me — includes role-specific profile pointers."""
    pass


# Aliases used by endpoints
UserUpdate = UserUpdateRequest
