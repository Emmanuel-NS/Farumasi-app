from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.core.constants import UserRole
from app.models.user import User
from app.schemas.article import (
    ArticleOut,
    ArticleCreate,
    ArticleUpdate,
    ArticlePublicOut,
)
from app.schemas.common import PaginatedResponse
from app.services.article_service import ArticleService

router = APIRouter()


# ── Public read endpoints (no auth required) ─────────────────────────────
@router.get("/", response_model=PaginatedResponse[ArticlePublicOut])
async def list_published_articles(
    category: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await ArticleService(db).list_published(
        category=category, offset=offset, limit=limit
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/slug/{slug}", response_model=ArticlePublicOut)
async def get_article_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    return await ArticleService(db).get_public_by_slug(slug)


# ── Admin/author endpoints ───────────────────────────────────────────────
@router.get(
    "/admin/all",
    response_model=PaginatedResponse[ArticleOut],
)
async def list_all_articles(
    status: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    items, total = await ArticleService(db).list_admin(
        actor, status=status, offset=offset, limit=limit
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    """Authenticated read by id — published, draft, or archived."""
    article = await ArticleService(db).get_by_id(article_id)
    # Non-authors can only see published articles via this endpoint
    if article.status != "published" and actor.role not in (UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN):
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Article", article_id)
    return article


@router.post("/", response_model=ArticleOut, status_code=201)
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    article = await ArticleService(db).create_article(data, actor)
    await db.commit()
    await db.refresh(article)
    return article


@router.patch("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: str,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    article = await ArticleService(db).update_article(article_id, data, actor)
    await db.commit()
    await db.refresh(article)
    return article


@router.patch("/{article_id}/publish", response_model=ArticleOut)
async def publish_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    article = await ArticleService(db).publish_article(article_id, actor)
    await db.commit()
    await db.refresh(article)
    return article


@router.patch("/{article_id}/archive", response_model=ArticleOut)
async def archive_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    article = await ArticleService(db).archive_article(article_id, actor)
    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=204)
async def delete_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.PHARMACIST, UserRole.PHARMACY_ADMIN, UserRole.SUPER_ADMIN)),
):
    await ArticleService(db).delete_article(article_id, actor)
    await db.commit()

