from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.dependencies.auth import get_current_user, get_optional_current_user
from app.dependencies.roles import require_roles
from app.models.article import HealthArticle
from app.models.user import User
from app.schemas.article import (
    ArticleCommentCreate,
    ArticleCommentOut,
    ArticleCreate,
    ArticleOut,
    ArticlePublicOut,
    ArticleSponsoredUpdate,
    ArticleUpdate,
)
from app.schemas.common import PaginatedResponse
from app.services.article_service import ArticleService, serialize_article


router = APIRouter()


def _public(article: HealthArticle, *, is_liked: bool = False, is_saved: bool = False) -> ArticlePublicOut:
    return ArticlePublicOut(**serialize_article(article, is_liked=is_liked, is_saved=is_saved))


def _admin(article: HealthArticle) -> ArticleOut:
    return ArticleOut(**serialize_article(article, include_admin=True))


# ── Public read endpoints ─────────────────────────────────────────────────
@router.get("/", response_model=PaginatedResponse[ArticlePublicOut])
async def list_published_articles(
    category: Optional[str] = Query(None),
    categories: Optional[List[str]] = Query(None),
    article_type: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(
        None,
        description="newest|oldest|likes|views|shares|comments (default newest)",
    ),
    saved_only: bool = Query(False),
    sponsored_only: bool = Query(
        False,
        description="When true, return only published sponsored articles (patient carousel).",
    ),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    service = ArticleService(db)
    if saved_only:
        if not actor:
            return PaginatedResponse(items=[], total=0, offset=offset, limit=limit)
        items, total = await service.list_saved(actor, offset=offset, limit=limit)
    else:
        items, total = await service.list_published(
            category=category,
            categories=categories,
            article_type=article_type,
            sort_by=sort_by,
            sponsored_only=sponsored_only,
            offset=offset,
            limit=limit,
        )

    liked: set[str] = set()
    saved: set[str] = set()
    if actor and items:
        ids = [a.id for a in items]
        liked = await service.liked_ids(actor.id, ids)
        saved = await service.saved_ids(actor.id, ids) if not saved_only else set(ids)

    return PaginatedResponse(
        items=[_public(a, is_liked=a.id in liked, is_saved=a.id in saved) for a in items],
        total=total,
        offset=offset,
        limit=limit,
    )


async def _sponsored_public_list(
    *,
    limit: int,
    db: AsyncSession,
    actor: Optional[User],
) -> list[ArticlePublicOut]:
    """Shared handler for sponsored carousel endpoints."""
    service = ArticleService(db)
    items = await service.list_sponsored_published(limit=limit)
    liked: set[str] = set()
    saved: set[str] = set()
    if actor and items:
        ids = [a.id for a in items]
        liked = await service.liked_ids(actor.id, ids)
        saved = await service.saved_ids(actor.id, ids)
    return [
        _public(a, is_liked=a.id in liked, is_saved=a.id in saved) for a in items
    ]


@router.get("/feed/sponsored", response_model=list[ArticlePublicOut])
async def list_sponsored_feed(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    """Published sponsored posts — safe path (not captured by /{article_id})."""
    return await _sponsored_public_list(limit=limit, db=db, actor=actor)


@router.get("/sponsored", response_model=list[ArticlePublicOut])
async def list_sponsored_articles(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    """Alias for sponsored feed (legacy clients)."""
    return await _sponsored_public_list(limit=limit, db=db, actor=actor)


@router.get("/me/saved", response_model=PaginatedResponse[ArticlePublicOut])
async def list_my_saved(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    items, total = await service.list_saved(actor, offset=offset, limit=limit)
    liked = await service.liked_ids(actor.id, [a.id for a in items])
    return PaginatedResponse(
        items=[_public(a, is_liked=a.id in liked, is_saved=True) for a in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/slug/{slug}", response_model=ArticlePublicOut)
async def get_article_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    article = await ArticleService(db).get_public_by_slug(slug)
    is_liked = is_saved = False
    if actor:
        service = ArticleService(db)
        liked = await service.liked_ids(actor.id, [article.id])
        saved = await service.saved_ids(actor.id, [article.id])
        is_liked = article.id in liked
        is_saved = article.id in saved
    return _public(article, is_liked=is_liked, is_saved=is_saved)


# ── Admin/author endpoints ───────────────────────────────────────────────
@router.get("/admin/all", response_model=PaginatedResponse[ArticleOut])
async def list_all_articles(
    status_filter: Optional[str] = Query(None, alias="status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    items, total = await ArticleService(db).list_admin(
        actor, status=status_filter, offset=offset, limit=limit
    )
    return PaginatedResponse(
        items=[_admin(a) for a in items], total=total, offset=offset, limit=limit
    )


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    article = await ArticleService(db).get_by_id(article_id)
    if article.status != "published" and actor.role not in (
        UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN
    ):
        raise NotFoundError("Article", article_id)
    return _admin(article)


@router.post("/", response_model=ArticleOut, status_code=201)
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    article = await ArticleService(db).create_article(data, actor)
    await db.commit()
    await db.refresh(article)
    return _admin(article)


@router.patch("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: str,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    article = await ArticleService(db).update_article(article_id, data, actor)
    await db.commit()
    await db.refresh(article)
    return _admin(article)


@router.patch("/{article_id}/sponsored", response_model=ArticleOut)
async def set_article_sponsored(
    article_id: str,
    data: ArticleSponsoredUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    """Toggle sponsored flag (persisted on health_articles.is_sponsored)."""
    article = await ArticleService(db).set_sponsored(
        article_id, data.is_sponsored, actor
    )
    await db.commit()
    await db.refresh(article)
    return _admin(article)


@router.patch("/{article_id}/publish", response_model=ArticleOut)
async def publish_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    article = await ArticleService(db).publish_article(article_id, actor)
    await db.commit()
    await db.refresh(article)
    return _admin(article)


@router.patch("/{article_id}/archive", response_model=ArticleOut)
async def archive_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    article = await ArticleService(db).archive_article(article_id, actor)
    await db.commit()
    await db.refresh(article)
    return _admin(article)


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)
    ),
):
    await ArticleService(db).delete_article(article_id, actor)
    await db.commit()


# ── Engagement endpoints ─────────────────────────────────────────────────
@router.post("/{article_id}/like", response_model=ArticlePublicOut)
async def like_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    article = await service.like(article_id, actor)
    await db.commit()
    await db.refresh(article)
    saved = await service.saved_ids(actor.id, [article.id])
    return _public(article, is_liked=True, is_saved=article.id in saved)


@router.delete("/{article_id}/like", response_model=ArticlePublicOut)
async def unlike_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    article = await service.unlike(article_id, actor)
    await db.commit()
    await db.refresh(article)
    saved = await service.saved_ids(actor.id, [article.id])
    return _public(article, is_liked=False, is_saved=article.id in saved)


@router.post("/{article_id}/save", response_model=ArticlePublicOut)
async def save_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    article = await service.save(article_id, actor)
    await db.commit()
    await db.refresh(article)
    liked = await service.liked_ids(actor.id, [article.id])
    return _public(article, is_liked=article.id in liked, is_saved=True)


@router.delete("/{article_id}/save", response_model=ArticlePublicOut)
async def unsave_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    article = await service.unsave(article_id, actor)
    await db.commit()
    await db.refresh(article)
    liked = await service.liked_ids(actor.id, [article.id])
    return _public(article, is_liked=article.id in liked, is_saved=False)


@router.post("/{article_id}/share", response_model=ArticlePublicOut)
async def share_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    service = ArticleService(db)
    article = await service.track_share(article_id)
    await db.commit()
    await db.refresh(article)
    is_liked = is_saved = False
    if actor:
        is_liked = article.id in (await service.liked_ids(actor.id, [article.id]))
        is_saved = article.id in (await service.saved_ids(actor.id, [article.id]))
    return _public(article, is_liked=is_liked, is_saved=is_saved)


@router.post("/{article_id}/view", response_model=ArticlePublicOut)
async def view_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: Optional[User] = Depends(get_optional_current_user),
):
    service = ArticleService(db)
    article = await service.track_view(article_id)
    await db.commit()
    await db.refresh(article)
    is_liked = is_saved = False
    if actor:
        is_liked = article.id in (await service.liked_ids(actor.id, [article.id]))
        is_saved = article.id in (await service.saved_ids(actor.id, [article.id]))
    return _public(article, is_liked=is_liked, is_saved=is_saved)


# ── Comments ─────────────────────────────────────────────────────────────
def _comment_out(c, *, user_name: Optional[str]) -> ArticleCommentOut:
    return ArticleCommentOut(
        id=c.id,
        article_id=c.article_id,
        user_id=c.user_id,
        parent_id=c.parent_id,
        content=c.content,
        created_at=c.created_at,
        user_name=user_name,
    )


@router.get("/{article_id}/comments", response_model=List[ArticleCommentOut])
async def list_comments(
    article_id: str,
    db: AsyncSession = Depends(get_db),
):
    service = ArticleService(db)
    comments = await service.list_comments(article_id)
    user_ids = list({c.user_id for c in comments})
    names: dict[str, Optional[str]] = {}
    if user_ids:
        res = await db.execute(select(User.id, User.full_name).where(User.id.in_(user_ids)))
        names = {row[0]: row[1] for row in res.all()}
    return [_comment_out(c, user_name=names.get(c.user_id)) for c in comments]


@router.post(
    "/{article_id}/comments",
    response_model=ArticleCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_comment(
    article_id: str,
    data: ArticleCommentCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service = ArticleService(db)
    comment = await service.add_comment(article_id, data, actor)
    await db.commit()
    await db.refresh(comment)
    return _comment_out(comment, user_name=actor.full_name)


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await ArticleService(db).delete_comment(comment_id, actor)
    await db.commit()
