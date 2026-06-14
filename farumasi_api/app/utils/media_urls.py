from __future__ import annotations

from urllib.parse import urlparse
import re

_PRODUCT_PATH = re.compile(r"/(?:store|inventory|products)/", re.I)
_IMAGE_EXT = re.compile(r"\.(png|jpe?g|webp|gif|bmp|svg)(?:\?.*)?$", re.I)


def normalize_attachment_url(url: str | None) -> str | None:
    """Store attachment references in a stable, backend-relative form when possible."""
    if not url:
        return None
    raw = url.strip()
    if not raw:
        return None

    # Keep durable remote object URLs (S3, Cloudinary, CDN).
    lower = raw.lower()
    if lower.startswith("https://") or lower.startswith("http://"):
        if any(
            marker in lower
            for marker in (
                ".amazonaws.com/",
                "res.cloudinary.com/",
                "cloudinary.com/",
            )
        ):
            return raw
        parsed = urlparse(raw)
        if parsed.path.startswith("/uploads/"):
            return parsed.path
        return raw

    if raw.startswith("uploads/"):
        return f"/{raw}"
    if raw.startswith("/uploads/"):
        return raw
    return raw


def is_upload_attachment_url(url: str) -> bool:
    return "/uploads/" in (normalize_attachment_url(url) or url).lower()


def is_product_attachment_url(url: str) -> bool:
    if not url or is_upload_attachment_url(url):
        return False
    lower = url.lower()
    return bool(_PRODUCT_PATH.search(lower))


def resolve_attachment_type(
    url: str | None,
    declared: str | None = None,
) -> str | None:
    """Return image | file | product for a consult attachment."""
    if not url:
        return declared if declared in ("image", "file", "product") else None

    normalized = normalize_attachment_url(url) or url
    lower = normalized.lower()
    declared_norm = declared if declared in ("image", "file", "product") else None

    if is_upload_attachment_url(normalized):
        if declared_norm in ("image", "file"):
            return declared_norm
        if _IMAGE_EXT.search(lower) or "/uploads/images/" in lower:
            return "image"
        return "file"

    if is_product_attachment_url(normalized):
        return "product"

    if declared_norm:
        return declared_norm
    if _IMAGE_EXT.search(lower) or "res.cloudinary.com/" in lower and "/image/" in lower:
        return "image"
    return "file"
