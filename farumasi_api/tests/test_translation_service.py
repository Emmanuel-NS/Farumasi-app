"""Translation cache utilities (unit tests — no DB)."""
from __future__ import annotations

from app.services.translation_service import (
    normalize_source_text,
    translation_hash,
)


def test_normalize_and_hash_stable():
    a = normalize_source_text("  Hello   world  ")
    b = normalize_source_text("Hello world")
    assert a == b
    assert translation_hash("en", "rw", "ui:test", a) == translation_hash(
        "en", "rw", "ui:test", b
    )


def test_hash_differs_by_context():
    text = "Hello"
    assert translation_hash("en", "rw", "ui:a", text) != translation_hash(
        "en", "rw", "ui:b", text
    )
