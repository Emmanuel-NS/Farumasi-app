from __future__ import annotations

from typing import List, Optional

from pydantic import Field, field_validator

from app.schemas.common import FarumasiBaseModel

SUPPORTED_LANGS = frozenset({"en", "rw", "fr", "sw"})


class TranslationItemIn(FarumasiBaseModel):
    id: str = Field(..., description="Client correlation id (e.g. ui key or notification id)")
    text: str = Field(..., min_length=1, max_length=5000)
    context: Optional[str] = Field(
        default="dynamic",
        max_length=120,
        description="Cache namespace, e.g. ui:nav_home or notification",
    )


class TranslationBatchIn(FarumasiBaseModel):
    source_lang: str = "en"
    target_lang: str
    items: List[TranslationItemIn] = Field(..., min_length=1, max_length=100)

    @field_validator("source_lang", "target_lang")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        code = (v or "en").lower().strip()
        if code not in SUPPORTED_LANGS:
            raise ValueError(f"Unsupported language: {v}")
        return code


class TranslationItemOut(FarumasiBaseModel):
    id: str
    text: str
    cached: bool
    source_lang: str
    target_lang: str


class TranslationUsageOut(FarumasiBaseModel):
    chars_used_today: int
    daily_char_limit: int
    chars_remaining: int
    api_calls_today: int
    translation_enabled: bool


class TranslationBatchOut(FarumasiBaseModel):
    translations: List[TranslationItemOut]
    usage: TranslationUsageOut
