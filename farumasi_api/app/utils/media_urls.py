from __future__ import annotations

from urllib.parse import urlparse


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
