from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from app.schemas.common import FarumasiBaseModel
from app.core.constants import ArticleStatus


class ArticleCreate(FarumasiBaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    # Single category kept for backward-compat; if `categories` is provided
    # it takes precedence and `category` mirrors the first entry.
    category: Optional[str] = None
    categories: Optional[List[str]] = None
    # Post type: "article" | "tip" | "guide" | "news" | "did_you_know"
    article_type: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    slug: Optional[str] = None


class ArticleUpdate(FarumasiBaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    categories: Optional[List[str]] = None
    article_type: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class ArticleStatusUpdate(FarumasiBaseModel):
    status: ArticleStatus


class ArticleOut(FarumasiBaseModel):
    id: str
    author_pharmacist_id: Optional[str] = None
    title: str
    slug: str
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    categories: List[str] = []
    article_type: str = "article"
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    status: str
    published_at: Optional[datetime] = None
    created_at: datetime
    view_count: int = 0
    like_count: int = 0
    share_count: int = 0
    comment_count: int = 0


class ArticlePublicOut(FarumasiBaseModel):
    """Read-only public view (no draft/admin fields)."""
    id: str
    author_pharmacist_id: Optional[str] = None
    title: str
    slug: str
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    categories: List[str] = []
    article_type: str = "article"
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: int = 0
    like_count: int = 0
    share_count: int = 0
    comment_count: int = 0
    is_liked: bool = False
    is_saved: bool = False


# ── Comments ──────────────────────────────────────────────────────────
class ArticleCommentCreate(FarumasiBaseModel):
    content: str
    parent_id: Optional[str] = None


class ArticleCommentOut(FarumasiBaseModel):
    id: str
    article_id: str
    user_id: str
    parent_id: Optional[str] = None
    content: str
    created_at: datetime
    user_name: Optional[str] = None
