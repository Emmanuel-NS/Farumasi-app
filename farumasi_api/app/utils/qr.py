from __future__ import annotations

import base64
import hashlib
import io
import secrets
import uuid
from datetime import datetime, timezone

import qrcode
from qrcode.image.svg import SvgImage


def generate_qr_token() -> str:
    """Generate a secure, unique QR token for delivery confirmation."""
    return secrets.token_urlsafe(32)


def build_qr_image_base64(data: str) -> str:
    """
    Generate a QR code PNG from `data` and return it as a base64-encoded string
    (suitable for embedding in an <img src="data:image/png;base64,..."> tag).
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def build_delivery_qr_payload(delivery_id: str, order_id: str, token: str) -> str:
    """Build the string that gets encoded in the QR code."""
    return f"farumasi:delivery:{delivery_id}:order:{order_id}:token:{token}"
