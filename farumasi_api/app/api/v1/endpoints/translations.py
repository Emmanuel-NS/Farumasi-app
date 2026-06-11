"""Translation API — cached Google Translate for UI and dynamic content."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_optional_current_user
from app.models.user import User
from app.schemas.translation import (
    TranslationBatchIn,
    TranslationBatchOut,
    TranslationItemOut,
    TranslationUsageOut,
)
from app.services.translation_service import TranslationService

router = APIRouter()


@router.get("/status", response_model=TranslationUsageOut)
async def translation_status(db: AsyncSession = Depends(get_db)):
    usage = await TranslationService(db).get_usage_snapshot()
    return TranslationUsageOut(**usage)


@router.post("/batch", response_model=TranslationBatchOut)
async def translate_batch(
    data: TranslationBatchIn,
    db: AsyncSession = Depends(get_db),
    _: User | None = Depends(get_optional_current_user),
):
    """
    Translate up to 100 strings in one request.

    Strings already in the database cache are returned without calling Google.
    Authenticated users preferred; guests may use for UI warm-up (rate-limited by budget).
    """
    svc = TranslationService(db)
    items = [
        {"id": it.id, "text": it.text, "context": it.context or "dynamic"}
        for it in data.items
    ]
    translated, usage = await svc.translate_batch(
        source_lang=data.source_lang,
        target_lang=data.target_lang,
        items=items,
    )
    return TranslationBatchOut(
        translations=[TranslationItemOut(**row) for row in translated],
        usage=TranslationUsageOut(**usage),
    )
