from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import ContentPageStatus, UserStatus
from app.core.content_defaults import DEFAULT_CONTENT_PAGES
from app.core.exceptions import BusinessRuleError, NotFoundError, ValidationError
from app.models.content_page import ContentPage, ContentPageNotification
from app.models.user import User
from app.schemas.content_page import (
    ContentPageAdminOut,
    ContentPageNotify,
    ContentPageNotifyResult,
    ContentPageOut,
    ContentPageUpdate,
)
from app.services.audit_service import AuditService
from app.services.email_delivery_service import send_content_update_email
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class ContentPageService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_defaults(self) -> None:
        result = await self.db.execute(select(ContentPage.id).limit(1))
        if result.scalar_one_or_none():
            return
        now = datetime.now(timezone.utc)
        for row in DEFAULT_CONTENT_PAGES:
            self.db.add(
                ContentPage(
                    slug=row["slug"],
                    page_type=row["page_type"],
                    audience=row["audience"],
                    title=row["title"],
                    summary=row.get("summary"),
                    body=row.get("body"),
                    status=ContentPageStatus.PUBLISHED,
                    version=1,
                    contact_meta=row.get("contact_meta") or {},
                    published_at=now,
                )
            )
        await self.db.flush()

    async def list_pages(
        self,
        *,
        audience: Optional[str] = None,
        published_only: bool = True,
    ) -> list[ContentPageOut]:
        await self.ensure_defaults()
        q = select(ContentPage).order_by(ContentPage.page_type, ContentPage.title)
        if audience:
            q = q.where(
                (ContentPage.audience == audience) | (ContentPage.audience == "all")
            )
        if published_only:
            q = q.where(ContentPage.status == ContentPageStatus.PUBLISHED)
        rows = (await self.db.execute(q)).scalars().all()
        return [self._out(p) for p in rows]

    async def list_admin(self) -> list[ContentPageAdminOut]:
        await self.ensure_defaults()
        rows = (
            await self.db.execute(
                select(ContentPage, User)
                .outerjoin(User, ContentPage.updated_by_user_id == User.id)
                .order_by(ContentPage.audience, ContentPage.page_type)
            )
        ).all()
        return [self._admin_out(page, user) for page, user in rows]

    async def get_by_slug(
        self,
        slug: str,
        *,
        audience: str = "patient",
        published_only: bool = True,
    ) -> ContentPageOut:
        await self.ensure_defaults()
        q = select(ContentPage).where(
            ContentPage.slug == slug,
            (ContentPage.audience == audience) | (ContentPage.audience == "all"),
        )
        if published_only:
            q = q.where(ContentPage.status == ContentPageStatus.PUBLISHED)
        page = (await self.db.execute(q.limit(1))).scalar_one_or_none()
        if not page:
            raise NotFoundError("ContentPage", slug)
        return self._out(page)

    async def get_admin(self, page_id: str) -> ContentPageAdminOut:
        row = (
            await self.db.execute(
                select(ContentPage, User)
                .outerjoin(User, ContentPage.updated_by_user_id == User.id)
                .where(ContentPage.id == page_id)
            )
        ).first()
        if not row:
            raise NotFoundError("ContentPage", page_id)
        page, user = row
        return self._admin_out(page, user)

    async def update_page(
        self,
        page_id: str,
        data: ContentPageUpdate,
        actor: User,
    ) -> ContentPageAdminOut:
        page = await self._get_page(page_id)
        patch = data.model_dump(exclude_unset=True)
        body_changed = "body" in patch and patch["body"] != page.body

        for field, value in patch.items():
            setattr(page, field, value)

        if body_changed and page.status == ContentPageStatus.PUBLISHED:
            page.version = int(page.version or 1) + 1

        page.updated_by_user_id = actor.id
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="content_page.updated",
            entity_type="ContentPage",
            entity_id=page.id,
            new_value={"slug": page.slug, "version": page.version, "fields": list(patch.keys())},
        )
        await self.db.commit()
        return await self.get_admin(page.id)

    async def publish_page(self, page_id: str, actor: User) -> ContentPageAdminOut:
        page = await self._get_page(page_id)
        if page.status != ContentPageStatus.PUBLISHED:
            page.version = int(page.version or 1) + 1
        page.status = ContentPageStatus.PUBLISHED
        page.published_at = datetime.now(timezone.utc)
        page.updated_by_user_id = actor.id
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="content_page.published",
            entity_type="ContentPage",
            entity_id=page.id,
            new_value={"slug": page.slug, "version": page.version},
        )
        await self.db.commit()
        return await self.get_admin(page.id)

    async def notify_users(
        self,
        page_id: str,
        data: ContentPageNotify,
        actor: User,
    ) -> ContentPageNotifyResult:
        page = await self._get_page(page_id)
        if page.status != ContentPageStatus.PUBLISHED:
            raise BusinessRuleError("Publish this page before notifying users.")

        recipients = await self._resolve_recipients(data)
        if not recipients:
            raise ValidationError("No recipients matched your selection.")

        subject = (data.subject or "").strip() or f"FARUMASI — updated {page.title}"
        note = (data.message or "").strip()
        portal_url = (settings.PATIENT_PORTAL_URL or "").rstrip("/")
        page_path = self._portal_path(page)
        page_url = f"{portal_url}{page_path}" if portal_url else page_path

        now = datetime.now(timezone.utc)
        notif_row = ContentPageNotification(
            content_page_id=page.id,
            sent_by_user_id=actor.id,
            subject=subject,
            message=note or None,
            recipient_user_ids=data.user_ids if data.user_ids else None,
            roles_filter=data.roles if data.roles else None,
            recipient_count=len(recipients),
            sent_at=now,
        )
        self.db.add(notif_row)
        await self.db.flush()

        email_sent = 0
        in_app_sent = 0
        notif_svc = NotificationService(self.db)

        for user in recipients:
            if data.send_in_app:
                await notif_svc.send(
                    user.id,
                    title=subject,
                    message=note or f"We updated our {page.title}. Please review the latest version.",
                    category="legal",
                    action_url=page_path,
                )
                in_app_sent += 1

            if data.send_email and user.email:
                ok = await asyncio.to_thread(
                    send_content_update_email,
                    to_email=user.email,
                    full_name=user.full_name or "FARUMASI user",
                    page_title=page.title,
                    page_url=page_url,
                    version=page.version,
                    custom_note=note,
                )
                if ok:
                    email_sent += 1

        notif_row.email_sent_count = email_sent
        notif_row.in_app_sent_count = in_app_sent
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="content_page.notify",
            entity_type="ContentPage",
            entity_id=page.id,
            new_value={
                "notification_id": notif_row.id,
                "recipient_count": len(recipients),
                "email_sent": email_sent,
                "in_app_sent": in_app_sent,
            },
        )
        await self.db.commit()

        return ContentPageNotifyResult(
            notification_id=notif_row.id,
            recipient_count=len(recipients),
            email_sent_count=email_sent,
            in_app_sent_count=in_app_sent,
            sent_at=now.isoformat(),
        )

    async def _resolve_recipients(self, data: ContentPageNotify) -> list[User]:
        if data.user_ids:
            ids = [uid.strip() for uid in data.user_ids if uid and uid.strip()]
            if not ids:
                raise ValidationError("Select at least one user or use all active users.")
            rows = (
                await self.db.execute(select(User).where(User.id.in_(ids)))
            ).scalars().all()
            return [u for u in rows if u.status == UserStatus.ACTIVE]

        q = select(User).where(User.status == UserStatus.ACTIVE)
        if data.roles:
            q = q.where(User.role.in_(data.roles))
        return list((await self.db.execute(q)).scalars().all())

    async def _get_page(self, page_id: str) -> ContentPage:
        page = (
            await self.db.execute(select(ContentPage).where(ContentPage.id == page_id))
        ).scalar_one_or_none()
        if not page:
            raise NotFoundError("ContentPage", page_id)
        return page

    @staticmethod
    def _portal_path(page: ContentPage) -> str:
        if page.slug == "support":
            return "/help"
        if page.slug in ("terms", "privacy", "about"):
            return f"/legal/{page.slug}"
        return f"/legal/{page.slug}"

    @staticmethod
    def _out(page: ContentPage) -> ContentPageOut:
        return ContentPageOut(
            id=page.id,
            slug=page.slug,
            page_type=page.page_type,
            audience=page.audience,
            title=page.title,
            summary=page.summary,
            body=page.body,
            status=page.status,
            version=page.version,
            contact_meta=page.contact_meta,
            published_at=page.published_at.isoformat() if page.published_at else None,
            updated_at=page.updated_at.isoformat() if page.updated_at else None,
        )

    @staticmethod
    def _admin_out(page: ContentPage, user: Optional[User]) -> ContentPageAdminOut:
        base = ContentPageService._out(page)
        return ContentPageAdminOut(
            **base.model_dump(),
            updated_by_name=user.full_name if user else None,
        )
