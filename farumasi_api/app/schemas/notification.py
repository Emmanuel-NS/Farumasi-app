from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel


class NotificationOut(FarumasiBaseModel):
    id: str
    user_id: str
    title: str
    message: str
    category: Optional[str] = None
    read_status: bool
    action_url: Optional[str] = None
    created_at: datetime


class NotificationCreate(FarumasiBaseModel):
    """Used by admins to broadcast a system notification to a target user."""
    user_id: str
    title: str
    message: str
    category: Optional[str] = "system"
    action_url: Optional[str] = None


class NotificationReadUpdate(FarumasiBaseModel):
    read_status: bool = True


class NotificationUnreadCount(FarumasiBaseModel):
    unread: int
