from __future__ import annotations

import hashlib
import logging
import re
import uuid
from datetime import date, datetime, timezone
from typing import Dict, List, Optional, Sequence, Tuple

import httpx
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.translation_cache import TranslationCache, TranslationUsageDaily

logger = logging.getLogger(__name__)

_WHITESPACE_RE = re.compile(r"\s+")


def normalize_source_text(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", (text or "").strip())


def translation_hash(
    source_lang: str,
    target_lang: str,
    context: str,
    text: str,
) -> str:
    payload = f"{source_lang}|{target_lang}|{context}|{normalize_source_text(text)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class TranslationService:
    """Google Translate with PostgreSQL cache and daily character budget."""

    def __init__(self, db: AsyncSession):
        self.db = db

    @property
    def enabled(self) -> bool:
        return bool(settings.TRANSLATION_ENABLED and settings.GOOGLE_TRANSLATE_API_KEY)

    async def get_usage_snapshot(self) -> dict:
        limit = settings.TRANSLATION_DAILY_CHAR_LIMIT
        used = await self._chars_used_today()
        return {
            "chars_used_today": used,
            "daily_char_limit": limit,
            "chars_remaining": max(0, limit - used),
            "api_calls_today": await self._api_calls_today(),
            "translation_enabled": self.enabled,
        }

    async def translate_batch(
        self,
        *,
        source_lang: str,
        target_lang: str,
        items: Sequence[dict],
    ) -> Tuple[List[dict], dict]:
        source_lang = (source_lang or "en").lower()
        target_lang = (target_lang or "en").lower()

        if source_lang == target_lang:
            return [
                {
                    "id": it["id"],
                    "text": it["text"],
                    "cached": True,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                }
                for it in items
            ], await self.get_usage_snapshot()

        results: List[dict] = []
        to_translate: List[Tuple[int, dict, str]] = []

        for idx, it in enumerate(items):
            text = normalize_source_text(it.get("text", ""))
            if not text:
                results.append(
                    {
                        "id": it["id"],
                        "text": "",
                        "cached": True,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                    }
                )
                continue

            context = (it.get("context") or "dynamic")[:120]
            if len(text) > settings.TRANSLATION_MAX_TEXT_LENGTH:
                text = text[: settings.TRANSLATION_MAX_TEXT_LENGTH]

            cached = await self._get_cached(
                source_lang=source_lang,
                target_lang=target_lang,
                context=context,
                text=text,
            )
            if cached is not None:
                results.append(
                    {
                        "id": it["id"],
                        "text": cached,
                        "cached": True,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                    }
                )
                continue

            to_translate.append((idx, it, context))
            results.append(None)  # type: ignore[arg-type]

        if to_translate:
            translated_map = await self._translate_missing(
                source_lang=source_lang,
                target_lang=target_lang,
                pending=to_translate,
            )
            for (idx, it, context), translated in translated_map.items():
                text = normalize_source_text(it["text"])
                results[idx] = {
                    "id": it["id"],
                    "text": translated,
                    "cached": False,
                    "source_lang": source_lang,
                    "target_lang": target_lang,
                }
                await self._save_cache(
                    source_lang=source_lang,
                    target_lang=target_lang,
                    context=context,
                    source_text=text,
                    translated_text=translated,
                )

        return [r for r in results if r is not None], await self.get_usage_snapshot()

    async def translate_text(
        self,
        text: str,
        *,
        target_lang: str,
        source_lang: str = "en",
        context: str = "dynamic",
    ) -> str:
        if not text or not text.strip():
            return text
        out, _ = await self.translate_batch(
            source_lang=source_lang,
            target_lang=target_lang,
            items=[{"id": "0", "text": text, "context": context}],
        )
        return out[0]["text"] if out else text

    async def _get_cached(
        self,
        *,
        source_lang: str,
        target_lang: str,
        context: str,
        text: str,
    ) -> Optional[str]:
        h = translation_hash(source_lang, target_lang, context, text)
        row = (
            await self.db.execute(
                select(TranslationCache).where(
                    TranslationCache.source_hash == h,
                    TranslationCache.target_lang == target_lang,
                    TranslationCache.context == context,
                )
            )
        ).scalar_one_or_none()
        if not row:
            return None
        await self.db.execute(
            update(TranslationCache)
            .where(TranslationCache.id == row.id)
            .values(hit_count=TranslationCache.hit_count + 1)
        )
        return row.translated_text

    async def _save_cache(
        self,
        *,
        source_lang: str,
        target_lang: str,
        context: str,
        source_text: str,
        translated_text: str,
    ) -> None:
        h = translation_hash(source_lang, target_lang, context, source_text)
        stmt = pg_insert(TranslationCache).values(
            id=str(uuid.uuid4()),
            source_hash=h,
            source_lang=source_lang,
            target_lang=target_lang,
            context=context,
            source_text=source_text,
            translated_text=translated_text,
            provider="google" if self.enabled else "passthrough",
            char_count=len(source_text),
            hit_count=0,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["source_hash", "target_lang", "context"],
            set_={
                "translated_text": stmt.excluded.translated_text,
                "updated_at": datetime.now(timezone.utc),
            },
        )
        await self.db.execute(stmt)

    async def _translate_missing(
        self,
        *,
        source_lang: str,
        target_lang: str,
        pending: Sequence[Tuple[int, dict, str]],
    ) -> Dict[Tuple[int, dict, str], str]:
        if not self.enabled:
            return {(idx, it, ctx): normalize_source_text(it["text"]) for idx, it, ctx in pending}

        texts = [normalize_source_text(it["text"]) for _, it, _ in pending]
        total_chars = sum(len(t) for t in texts)
        if not await self._reserve_budget(total_chars):
            logger.warning(
                "Translation daily budget exceeded (%s chars requested)", total_chars
            )
            return {(idx, it, ctx): normalize_source_text(it["text"]) for idx, it, ctx in pending}

        translated: List[str] = []
        chunk_size = settings.TRANSLATION_MAX_BATCH_SIZE
        for i in range(0, len(texts), chunk_size):
            chunk = texts[i : i + chunk_size]
            translated.extend(
                await self._google_translate_batch(
                    chunk,
                    source_lang=source_lang,
                    target_lang=target_lang,
                )
            )

        out: Dict[Tuple[int, dict, str], str] = {}
        for (idx, it, ctx), tr in zip(pending, translated):
            out[(idx, it, ctx)] = tr
        return out

    async def _google_translate_batch(
        self,
        texts: List[str],
        *,
        source_lang: str,
        target_lang: str,
    ) -> List[str]:
        if not texts:
            return []

        url = "https://translation.googleapis.com/language/translate/v2"
        params = {"key": settings.GOOGLE_TRANSLATE_API_KEY}
        payload = {
            "q": texts,
            "source": source_lang,
            "target": target_lang,
            "format": "text",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, params=params, json=payload)
            resp.raise_for_status()
            data = resp.json()

        translations = data.get("data", {}).get("translations", [])
        results = [t.get("translatedText", texts[i]) for i, t in enumerate(translations)]
        if len(results) != len(texts):
            raise RuntimeError("Google Translate returned unexpected result count")

        chars = sum(len(t) for t in texts)
        await self._record_usage(chars, api_calls=1)
        return results

    async def _chars_used_today(self) -> int:
        today = date.today()
        row = await self.db.get(TranslationUsageDaily, today)
        return int(row.chars_used) if row else 0

    async def _api_calls_today(self) -> int:
        today = date.today()
        row = await self.db.get(TranslationUsageDaily, today)
        return int(row.api_calls) if row else 0

    async def _reserve_budget(self, chars: int) -> bool:
        limit = settings.TRANSLATION_DAILY_CHAR_LIMIT
        used = await self._chars_used_today()
        return used + chars <= limit

    async def _record_usage(self, chars: int, *, api_calls: int) -> None:
        today = date.today()
        now = datetime.now(timezone.utc)
        stmt = pg_insert(TranslationUsageDaily).values(
            usage_date=today,
            chars_used=chars,
            api_calls=api_calls,
            updated_at=now,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["usage_date"],
            set_={
                "chars_used": TranslationUsageDaily.chars_used + stmt.excluded.chars_used,
                "api_calls": TranslationUsageDaily.api_calls + stmt.excluded.api_calls,
                "updated_at": now,
            },
        )
        await self.db.execute(stmt)
