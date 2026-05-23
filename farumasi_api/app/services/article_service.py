from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ArticleStatus, UserRole
from app.core.exceptions import (
    AuthorizationError,
    NotFoundError,
    ValidationError,
)
from app.models.article import HealthArticle
from app.models.pharmacist import PharmacistProfile
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleUpdate
from app.services.audit_service import AuditService


_AUTHOR_ROLES = {UserRole.PHARMACIST, UserRole.SUPER_ADMIN}


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text or "article"


class ArticleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────
    async def _resolve_author_pharmacist_id(self, actor: User) -> Optional[str]:
        """Return the PharmacistProfile.id for the actor, or None for super_admin."""
        if actor.role == UserRole.PHARMACIST:
            res = await self.db.execute(
                select(PharmacistProfile).where(PharmacistProfile.user_id == actor.id)
            )
            profile = res.scalar_one_or_none()
            if not profile:
                raise NotFoundError("Pharmacist profile")
            return profile.id
        return None

    async def _ensure_unique_slug(self, slug: str) -> str:
        base = slug
        suffix = 1
        while True:
            res = await self.db.execute(
                select(HealthArticle.id).where(HealthArticle.slug == slug)
            )
            if not res.scalar_one_or_none():
                return slug
            suffix += 1
            slug = f"{base}-{suffix}"

    async def _get_or_404(self, article_id: str) -> HealthArticle:
        res = await self.db.execute(
            select(HealthArticle).where(HealthArticle.id == article_id)
        )
        article = res.scalar_one_or_none()
        if not article:
            raise NotFoundError("Article", article_id)
        return article

    async def _ensure_can_manage(self, article: HealthArticle, actor: User) -> None:
        if actor.role == UserRole.SUPER_ADMIN:
            return
        if actor.role != UserRole.PHARMACIST:
            raise AuthorizationError("Only pharmacists or super_admin can manage articles")
        pid = await self._resolve_author_pharmacist_id(actor)
        if article.author_pharmacist_id != pid:
            raise AuthorizationError("You can only manage your own articles")

    # ── Authoring ─────────────────────────────────────────────────────────
    async def create_article(self, data: ArticleCreate, actor: User) -> HealthArticle:
        if actor.role not in _AUTHOR_ROLES:
            raise AuthorizationError("Only pharmacists or super_admin can create articles")
        if not data.title or not data.title.strip():
            raise ValidationError("Title is required")
        if not data.content or not data.content.strip():
            raise ValidationError("Content is required")

        author_pharmacist_id = await self._resolve_author_pharmacist_id(actor)
        raw_slug = _slugify(data.slug or data.title)
        slug = await self._ensure_unique_slug(raw_slug)

        article = HealthArticle(
            author_pharmacist_id=author_pharmacist_id,
            title=data.title,
            slug=slug,
            summary=data.summary,
            content=data.content,
            category=data.category,
            image_url=data.image_url,
            status=ArticleStatus.DRAFT,
        )
        self.db.add(article)
        await self.db.flush()

        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="article.created",
            entity_type="HealthArticle",
            entity_id=article.id,
        )
        return article

    async def update_article(
        self, article_id: str, data: ArticleUpdate, actor: User
    ) -> HealthArticle:
        article = await self._get_or_404(article_id)
        await self._ensure_can_manage(article, actor)

        payload = data.model_dump(exclude_unset=True)
        for field, value in payload.items():
            setattr(article, field, value)

        # If title changed and no manual slug was set, regenerate slug
        if "title" in payload:
            new_slug = await self._ensure_unique_slug(_slugify(article.title))
            if new_slug != article.slug:
                # Only regenerate when current slug no longer matches title-derived form
                if _slugify(article.title) != article.slug.rsplit("-", 1)[0]:
                    article.slug = new_slug

        await self.db.flush()
        return article

    async def publish_article(self, article_id: str, actor: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        await self._ensure_can_manage(article, actor)
        article.status = ArticleStatus.PUBLISHED
        article.published_at = datetime.now(timezone.utc)
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="article.published",
            entity_type="HealthArticle",
            entity_id=article.id,
        )
        return article

    async def archive_article(self, article_id: str, actor: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        await self._ensure_can_manage(article, actor)
        article.status = ArticleStatus.ARCHIVED
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="article.archived",
            entity_type="HealthArticle",
            entity_id=article.id,
        )
        return article

    async def delete_article(self, article_id: str, actor: User) -> None:
        article = await self._get_or_404(article_id)
        await self._ensure_can_manage(article, actor)
        await self.db.delete(article)
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="article.deleted",
            entity_type="HealthArticle",
            entity_id=article_id,
        )

    # ── Reading ──────────────────────────────────────────────────────────
    async def get_by_id(self, article_id: str) -> HealthArticle:
        return await self._get_or_404(article_id)

    async def get_public_by_slug(self, slug: str) -> HealthArticle:
        res = await self.db.execute(
            select(HealthArticle).where(
                HealthArticle.slug == slug,
                HealthArticle.status == ArticleStatus.PUBLISHED,
            )
        )
        article = res.scalar_one_or_none()
        if not article:
            raise NotFoundError("Article")
        return article

    async def list_published(
        self,
        category: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[HealthArticle], int]:
        q = select(HealthArticle).where(HealthArticle.status == ArticleStatus.PUBLISHED)
        if category:
            q = q.where(HealthArticle.category == category)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(HealthArticle.published_at.desc()).offset(offset).limit(limit)
        items = list((await self.db.execute(q)).scalars().all())
        return items, total

    async def list_admin(
        self,
        actor: User,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[HealthArticle], int]:
        if actor.role not in _AUTHOR_ROLES:
            raise AuthorizationError("Only pharmacists or super_admin can list all articles")
        q = select(HealthArticle)
        if actor.role == UserRole.PHARMACIST:
            pid = await self._resolve_author_pharmacist_id(actor)
            q = q.where(HealthArticle.author_pharmacist_id == pid)
        if status:
            q = q.where(HealthArticle.status == status)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(HealthArticle.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.db.execute(q)).scalars().all())
        return items, total
