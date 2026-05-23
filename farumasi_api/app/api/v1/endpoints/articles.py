from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_super_admin
from app.models.user import User
from app.schemas.article import ArticleOut, ArticleCreate, ArticleUpdate
from app.schemas.common import PaginatedResponse
from app.services.article_service import ArticleService

router = APIRouter()


@router.post("/", response_model=ArticleOut, status_code=201)
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await ArticleService(db).create_article(data, actor)


@router.get("/", response_model=PaginatedResponse[ArticleOut])
async def list_articles(
    category: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    items, total = await ArticleService(db).list_published(category=category, offset=offset, limit=limit)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str, db: AsyncSession = Depends(get_db)):
    return await ArticleService(db).get_article(article_id)


@router.put("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: str,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await ArticleService(db).update_article(article_id, data, actor)


@router.post("/{article_id}/publish", response_model=ArticleOut)
async def publish_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await ArticleService(db).publish_article(article_id, actor)


@router.post("/{article_id}/archive", response_model=ArticleOut)
async def archive_article(
    article_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await ArticleService(db).archive_article(article_id, actor)
