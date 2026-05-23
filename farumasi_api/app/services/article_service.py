from __future__ import annotations

import re
import unicodedata
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ArticleStatus, EntityStatus
from app.core.exceptions import NotFoundError, ValidationError
from app.models.article import HealthArticle
from app.schemas.article import ArticleCreate, ArticleUpdate
from app.services.audit_service import AuditService
from app.models.user import User


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text


class ArticleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_article(self, data: ArticleCreate, actor: User) -> HealthArticle:
        slug = _slugify(data.title)
        # Ensure slug uniqueness
        existing = await self.db.execute(
            select(HealthArticle).where(HealthArticle.slug == slug)
        )
        if existing.scalar_one_or_none():
            slug = f"{slug}-{actor.id[:6]}"

        article = HealthArticle(
            author_user_id=actor.id,
            title=data.title,
            slug=slug,
            excerpt=data.excerpt,
            body=data.body,
            category=data.category,
            tags=data.tags,
            cover_image_url=data.cover_image_url,
            status=ArticleStatus.DRAFT,
        )
        self.db.add(article)
        await self.db.flush()
        return article

    async def get_article(self, article_id: str) -> HealthArticle:
        result = await self.db.execute(
            select(HealthArticle).where(HealthArticle.id == article_id)
        )
        article = result.scalar_one_or_none()
        if not article:
            raise NotFoundError("Article", article_id)
        return article

    async def get_by_slug(self, slug: str) -> HealthArticle:
        result = await self.db.execute(
            select(HealthArticle).where(
                HealthArticle.slug == slug,
                HealthArticle.status == ArticleStatus.PUBLISHED,
            )
        )
        article = result.scalar_one_or_none()
        if not article:
            raise NotFoundError("Article")
        return article

    async def list_published(
        self, category: Optional[str] = None, offset: int = 0, limit: int = 20
    ) -> Tuple[List[HealthArticle], int]:
        from sqlalchemy import func

        q = select(HealthArticle).where(HealthArticle.status == ArticleStatus.PUBLISHED)
        if category:
            q = q.where(HealthArticle.category == category)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await self.db.execute(count_q)).scalar_one()

        q = q.offset(offset).limit(limit).order_by(HealthArticle.published_at.desc())
        items = list((await self.db.execute(q)).scalars().all())
        return items, total

    async def update_article(self, article_id: str, data: ArticleUpdate, actor: User) -> HealthArticle:
        article = await self.get_article(article_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(article, field, value)

        await self.db.flush()
        return article

    async def publish_article(self, article_id: str, actor: User) -> HealthArticle:
        from datetime import datetime, timezone
        article = await self.get_article(article_id)
        article.status = ArticleStatus.PUBLISHED
        article.published_at = datetime.now(timezone.utc)
        await self.db.flush()
        return article

    async def archive_article(self, article_id: str, actor: User) -> HealthArticle:
        article = await self.get_article(article_id)
        article.status = ArticleStatus.ARCHIVED
        await self.db.flush()
        return article
