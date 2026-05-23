from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import ArticleStatus


class ArticleCreate(FarumasiBaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class ArticleUpdate(FarumasiBaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None


class ArticleOut(FarumasiBaseModel):
    id: str
    author_pharmacist_id: Optional[str] = None
    title: str
    slug: str
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    published_at: Optional[datetime] = None
    created_at: datetime
