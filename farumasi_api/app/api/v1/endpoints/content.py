from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.content_page import ContentPageOut
from app.services.content_page_service import ContentPageService

router = APIRouter()


@router.get("/pages", response_model=list[ContentPageOut])
async def list_public_content_pages(
    audience: str = Query("patient"),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).list_pages(audience=audience, published_only=True)


@router.get("/pages/{slug}", response_model=ContentPageOut)
async def get_public_content_page(
    slug: str,
    audience: str = Query("patient"),
    db: AsyncSession = Depends(get_db),
):
    return await ContentPageService(db).get_by_slug(slug, audience=audience, published_only=True)
