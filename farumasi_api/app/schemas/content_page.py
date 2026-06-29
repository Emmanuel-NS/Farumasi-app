from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import Field

from app.schemas.common import FarumasiBaseModel


class ContentPageOut(FarumasiBaseModel):
    id: str
    slug: str
    page_type: str
    audience: str
    title: str
    summary: Optional[str] = None
    body: Optional[str] = None
    status: str
    version: int
    contact_meta: Optional[dict[str, Any]] = None
    published_at: Optional[str] = None
    updated_at: Optional[str] = None


class ContentPageAdminOut(ContentPageOut):
    updated_by_name: Optional[str] = None


class ContentPageUpdate(FarumasiBaseModel):
    title: Optional[str] = Field(default=None, max_length=500)
    summary: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    contact_meta: Optional[dict[str, Any]] = None


class ContentPageNotify(FarumasiBaseModel):
    """Notify users about a content update (e.g. terms change)."""

    user_ids: Optional[list[str]] = Field(
        default=None,
        description="Specific users; omit or empty for all active users",
    )
    roles: Optional[list[str]] = Field(
        default=None,
        description="When notifying all active users, optionally limit to these roles",
    )
    subject: Optional[str] = Field(default=None, max_length=500)
    message: Optional[str] = Field(
        default=None,
        max_length=4000,
        description="Optional note included in the email and notification",
    )
    send_email: bool = True
    send_in_app: bool = True


class ContentPageNotifyResult(FarumasiBaseModel):
    notification_id: str
    recipient_count: int
    email_sent_count: int
    in_app_sent_count: int
    sent_at: str


class ContentNotificationOut(FarumasiBaseModel):
    id: str
    content_page_id: str
    subject: str
    message: Optional[str] = None
    recipient_count: int
    email_sent_count: int
    in_app_sent_count: int
    sent_at: str
