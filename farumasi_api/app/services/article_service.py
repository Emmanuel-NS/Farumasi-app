from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Iterable, List, Optional, Set, Tuple

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ArticleStatus, UserRole
from app.core.exceptions import (
    AuthorizationError,
    NotFoundError,
    ValidationError,
)
from app.models.article import (
    ArticleComment,
    ArticleLike,
    ArticleSave,
    HealthArticle,
)
from app.models.pharmacist import PharmacistProfile
from app.models.user import User
from app.schemas.article import (
    ArticleCommentCreate,
    ArticleCreate,
    ArticleUpdate,
)
from app.services.audit_service import AuditService


_AUTHOR_ROLES = {UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN}
_PRIVILEGED_AUTHOR_ROLES = {UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN}

_VALID_TYPES = {"article", "tip", "guide", "news", "did_you_know"}

# Sort whitelist → SQL clauses applied to HealthArticle
_SORT_CLAUSES = {
    "newest": (HealthArticle.published_at.desc(), HealthArticle.created_at.desc()),
    "oldest": (HealthArticle.published_at.asc(), HealthArticle.created_at.asc()),
    "likes": (HealthArticle.like_count.desc(), HealthArticle.published_at.desc()),
    "views": (HealthArticle.view_count.desc(), HealthArticle.published_at.desc()),
    "shares": (HealthArticle.share_count.desc(), HealthArticle.published_at.desc()),
    "comments": (HealthArticle.comment_count.desc(), HealthArticle.published_at.desc()),
}


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text or "article"


def _decode_categories(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(x).strip() for x in data if isinstance(x, (str, int)) and str(x).strip()]


def _encode_categories(items: Optional[Iterable[str]]) -> Optional[str]:
    if items is None:
        return None
    clean = [str(x).strip() for x in items if str(x).strip()]
    # Deduplicate, preserve order
    seen: Set[str] = set()
    deduped: List[str] = []
    for c in clean:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    return json.dumps(deduped) if deduped else None


def serialize_article(
    article: HealthArticle,
    *,
    is_liked: bool = False,
    is_saved: bool = False,
    include_admin: bool = False,
) -> dict:
    """Serialize a HealthArticle row to the response shape used by both
    public and admin endpoints. The view layer wraps it in the appropriate
    Pydantic schema (ArticleOut or ArticlePublicOut).
    """
    base = {
        "id": article.id,
        "author_pharmacist_id": article.author_pharmacist_id,
        "title": article.title,
        "slug": article.slug,
        "summary": article.summary,
        "content": article.content,
        "category": article.category,
        "categories": _decode_categories(article.categories_json),
        "article_type": article.article_type or "article",
        "image_url": article.image_url,
        "video_url": article.video_url,
        "published_at": article.published_at,
        "view_count": article.view_count or 0,
        "like_count": article.like_count or 0,
        "share_count": article.share_count or 0,
        "comment_count": article.comment_count or 0,
        "is_sponsored": bool(getattr(article, "is_sponsored", False)),
        "is_liked": is_liked,
        "is_saved": is_saved,
    }
    if include_admin:
        base["status"] = article.status
        base["created_at"] = article.created_at
    return base


class ArticleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────
    async def _resolve_author_pharmacist_id(self, actor: User) -> Optional[str]:
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
        if actor.role in _PRIVILEGED_AUTHOR_ROLES:
            return
        if actor.role != UserRole.PHARMACIST:
            raise AuthorizationError("Only pharmacists, pharmacy admins or super_admin can manage articles")
        pid = await self._resolve_author_pharmacist_id(actor)
        if article.author_pharmacist_id != pid:
            raise AuthorizationError("You can only manage your own articles")

    def _normalize_type(self, raw: Optional[str]) -> str:
        if not raw:
            return "article"
        v = str(raw).strip().lower().replace("-", "_").replace(" ", "_")
        return v if v in _VALID_TYPES else "article"

    def _resolve_categories(
        self,
        category: Optional[str],
        categories: Optional[List[str]],
    ) -> Tuple[Optional[str], Optional[str]]:
        """Return (primary_category, categories_json) for persistence."""
        if categories:
            encoded = _encode_categories(categories)
            decoded = _decode_categories(encoded)
            primary = decoded[0] if decoded else category
            return primary, encoded
        if category and category.strip():
            return category.strip(), _encode_categories([category.strip()])
        return None, None

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
        primary_cat, cats_json = self._resolve_categories(data.category, data.categories)

        article = HealthArticle(
            author_pharmacist_id=author_pharmacist_id,
            title=data.title,
            slug=slug,
            summary=data.summary,
            content=data.content,
            category=primary_cat,
            categories_json=cats_json,
            article_type=self._normalize_type(data.article_type),
            image_url=data.image_url,
            video_url=data.video_url,
            is_sponsored=bool(data.is_sponsored or False),
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
        # Category/categories handled together
        if "category" in payload or "categories" in payload:
            primary_cat, cats_json = self._resolve_categories(
                payload.get("category", article.category),
                payload.get("categories"),
            )
            article.category = primary_cat
            article.categories_json = cats_json
            payload.pop("category", None)
            payload.pop("categories", None)
        if "article_type" in payload:
            article.article_type = self._normalize_type(payload.pop("article_type"))

        for field, value in payload.items():
            setattr(article, field, value)

        if "title" in data.model_dump(exclude_unset=True):
            new_slug = await self._ensure_unique_slug(_slugify(article.title))
            if new_slug != article.slug:
                if _slugify(article.title) != article.slug.rsplit("-", 1)[0]:
                    article.slug = new_slug

        await self.db.flush()
        return article

    async def set_sponsored(
        self, article_id: str, is_sponsored: bool, actor: User
    ) -> HealthArticle:
        article = await self._get_or_404(article_id)
        await self._ensure_can_manage(article, actor)
        article.is_sponsored = bool(is_sponsored)
        await self.db.flush()
        await AuditService(self.db).log(
            actor_user_id=actor.id,
            action="article.sponsored_changed",
            entity_type="HealthArticle",
            entity_id=article.id,
            new_value={"is_sponsored": article.is_sponsored},
        )
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

    def _apply_category_filter(self, query, category: Optional[str], categories: Optional[List[str]]):
        wants: List[str] = []
        if categories:
            wants.extend([c for c in categories if c])
        if category:
            wants.append(category)
        wants = [w.strip() for w in wants if w and w.strip()]
        if not wants:
            return query
        clauses = []
        for c in wants:
            clauses.append(HealthArticle.category == c)
            # categories_json is a JSON-encoded list — a quoted substring match
            # is enough since values are exact category names.
            clauses.append(HealthArticle.categories_json.like(f'%"{c}"%'))
        return query.where(or_(*clauses))

    def _apply_sort(self, query, sort_by: Optional[str]):
        clause = _SORT_CLAUSES.get((sort_by or "newest").lower(), _SORT_CLAUSES["newest"])
        return query.order_by(*clause)

    async def list_published(
        self,
        category: Optional[str] = None,
        categories: Optional[List[str]] = None,
        article_type: Optional[str] = None,
        sort_by: Optional[str] = None,
        sponsored_only: bool = False,
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[HealthArticle], int]:
        q = select(HealthArticle).where(HealthArticle.status == ArticleStatus.PUBLISHED)
        if sponsored_only:
            q = q.where(HealthArticle.is_sponsored.is_(True))
        # Keyword search looks across the full catalogue; skip category narrow-down
        # so users can find articles by any term regardless of active tab.
        if search and search.strip():
            tokens = [t for t in re.split(r"\s+", search.strip()) if t]
            for token in tokens[:8]:
                like = f"%{token}%"
                q = q.where(
                    or_(
                        HealthArticle.title.ilike(like),
                        HealthArticle.summary.ilike(like),
                        HealthArticle.content.ilike(like),
                        HealthArticle.category.ilike(like),
                        HealthArticle.categories_json.ilike(like),
                        HealthArticle.slug.ilike(like),
                        HealthArticle.article_type.ilike(like),
                    )
                )
        else:
            q = self._apply_category_filter(q, category, categories)
        if article_type:
            q = q.where(HealthArticle.article_type == self._normalize_type(article_type))
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = self._apply_sort(q, sort_by).offset(offset).limit(limit)
        items = list((await self.db.execute(q)).scalars().all())
        return items, total

    async def list_sponsored_published(
        self,
        *,
        limit: int = 10,
    ) -> List[HealthArticle]:
        q = (
            select(HealthArticle)
            .where(
                HealthArticle.status == ArticleStatus.PUBLISHED,
                HealthArticle.is_sponsored.is_(True),
            )
            .order_by(HealthArticle.published_at.desc(), HealthArticle.created_at.desc())
            .limit(min(limit, 20))
        )
        return list((await self.db.execute(q)).scalars().all())

    async def list_admin(
        self,
        actor: User,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[HealthArticle], int]:
        if actor.role not in _AUTHOR_ROLES:
            raise AuthorizationError("Only pharmacists, pharmacy admins or super_admin can list all articles")
        q = select(HealthArticle)
        if status:
            q = q.where(HealthArticle.status == status)
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(HealthArticle.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.db.execute(q)).scalars().all())
        return items, total

    # ── Engagement helpers ───────────────────────────────────────────────
    async def liked_ids(self, user_id: str, article_ids: List[str]) -> Set[str]:
        if not article_ids:
            return set()
        res = await self.db.execute(
            select(ArticleLike.article_id).where(
                ArticleLike.user_id == user_id,
                ArticleLike.article_id.in_(article_ids),
            )
        )
        return {row[0] for row in res.all()}

    async def saved_ids(self, user_id: str, article_ids: List[str]) -> Set[str]:
        if not article_ids:
            return set()
        res = await self.db.execute(
            select(ArticleSave.article_id).where(
                ArticleSave.user_id == user_id,
                ArticleSave.article_id.in_(article_ids),
            )
        )
        return {row[0] for row in res.all()}

    # ── Likes ────────────────────────────────────────────────────────────
    async def like(self, article_id: str, user: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        existing = await self.db.execute(
            select(ArticleLike).where(
                and_(ArticleLike.article_id == article_id, ArticleLike.user_id == user.id)
            )
        )
        if existing.scalar_one_or_none():
            return article
        self.db.add(ArticleLike(article_id=article_id, user_id=user.id))
        article.like_count = (article.like_count or 0) + 1
        await self.db.flush()
        return article

    async def unlike(self, article_id: str, user: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        res = await self.db.execute(
            delete(ArticleLike).where(
                and_(ArticleLike.article_id == article_id, ArticleLike.user_id == user.id)
            )
        )
        if res.rowcount and res.rowcount > 0:
            article.like_count = max(0, (article.like_count or 0) - 1)
        await self.db.flush()
        return article

    # ── Saves ────────────────────────────────────────────────────────────
    async def save(self, article_id: str, user: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        existing = await self.db.execute(
            select(ArticleSave).where(
                and_(ArticleSave.article_id == article_id, ArticleSave.user_id == user.id)
            )
        )
        if existing.scalar_one_or_none():
            return article
        self.db.add(ArticleSave(article_id=article_id, user_id=user.id))
        await self.db.flush()
        return article

    async def unsave(self, article_id: str, user: User) -> HealthArticle:
        article = await self._get_or_404(article_id)
        await self.db.execute(
            delete(ArticleSave).where(
                and_(ArticleSave.article_id == article_id, ArticleSave.user_id == user.id)
            )
        )
        await self.db.flush()
        return article

    async def list_saved(
        self,
        user: User,
        offset: int = 0,
        limit: int = 20,
    ) -> Tuple[List[HealthArticle], int]:
        q = (
            select(HealthArticle)
            .join(ArticleSave, ArticleSave.article_id == HealthArticle.id)
            .where(
                ArticleSave.user_id == user.id,
                HealthArticle.status == ArticleStatus.PUBLISHED,
            )
        )
        total = (await self.db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
        q = q.order_by(ArticleSave.created_at.desc()).offset(offset).limit(limit)
        items = list((await self.db.execute(q)).scalars().all())
        return items, total

    # ── Views / Shares ───────────────────────────────────────────────────
    async def track_view(self, article_id: str) -> HealthArticle:
        article = await self._get_or_404(article_id)
        article.view_count = (article.view_count or 0) + 1
        await self.db.flush()
        return article

    async def track_share(self, article_id: str) -> HealthArticle:
        article = await self._get_or_404(article_id)
        article.share_count = (article.share_count or 0) + 1
        await self.db.flush()
        return article

    # ── Comments ─────────────────────────────────────────────────────────
    async def list_comments(self, article_id: str) -> List[ArticleComment]:
        await self._get_or_404(article_id)
        res = await self.db.execute(
            select(ArticleComment)
            .where(ArticleComment.article_id == article_id)
            .order_by(ArticleComment.created_at.asc())
        )
        return list(res.scalars().all())

    async def add_comment(
        self, article_id: str, data: ArticleCommentCreate, user: User
    ) -> ArticleComment:
        article = await self._get_or_404(article_id)
        content = (data.content or "").strip()
        if not content:
            raise ValidationError("Comment content is required")
        if data.parent_id:
            res = await self.db.execute(
                select(ArticleComment).where(
                    ArticleComment.id == data.parent_id,
                    ArticleComment.article_id == article_id,
                )
            )
            if not res.scalar_one_or_none():
                raise NotFoundError("Parent comment", data.parent_id)
        comment = ArticleComment(
            article_id=article_id,
            user_id=user.id,
            parent_id=data.parent_id,
            content=content,
        )
        self.db.add(comment)
        article.comment_count = (article.comment_count or 0) + 1
        await self.db.flush()
        return comment

    async def delete_comment(self, comment_id: str, user: User) -> None:
        res = await self.db.execute(
            select(ArticleComment).where(ArticleComment.id == comment_id)
        )
        comment = res.scalar_one_or_none()
        if not comment:
            raise NotFoundError("Comment", comment_id)
        if comment.user_id != user.id and user.role not in _PRIVILEGED_AUTHOR_ROLES:
            raise AuthorizationError("You can only delete your own comments")
        article = await self._get_or_404(comment.article_id)
        await self.db.delete(comment)
        article.comment_count = max(0, (article.comment_count or 0) - 1)
        await self.db.flush()
