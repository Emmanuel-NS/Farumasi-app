from __future__ import annotations

import logging
import re

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def _normalize_rwanda_phone(phone: str) -> str | None:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return None
    if digits.startswith("250"):
        return f"+{digits}"
    if digits.startswith("0") and len(digits) >= 9:
        return f"+250{digits[1:]}"
    if len(digits) >= 9:
        return f"+250{digits}"
    return None


def _africas_talking_sms(to_phone: str, message: str) -> bool:
    username = settings.AFRICAS_TALKING_USERNAME
    api_key = settings.AFRICAS_TALKING_API_KEY
    if not username or not api_key:
        return False

    url = "https://api.africastalking.com/version1/messaging"
    payload = {
        "username": username,
        "to": to_phone,
        "message": message,
    }
    if settings.SMS_SENDER_ID:
        payload["from"] = settings.SMS_SENDER_ID

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                url,
                data=payload,
                headers={"apiKey": api_key, "Accept": "application/json"},
            )
            if resp.status_code >= 400:
                logger.warning("Africa's Talking SMS failed (%s): %s", resp.status_code, resp.text[:300])
                return False
        logger.info("SMS sent via Africa's Talking to %s", to_phone)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Africa's Talking SMS error: %s", exc)
        return False


def _http_webhook_sms(to_phone: str, message: str) -> bool:
    url = (settings.SMS_HTTP_URL or "").strip()
    if not url:
        return False
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                url,
                json={"phone": to_phone, "message": message, "sender": settings.SMS_SENDER_ID},
            )
            if resp.status_code >= 400:
                logger.warning("SMS webhook failed (%s): %s", resp.status_code, resp.text[:300])
                return False
        logger.info("SMS sent via webhook to %s", to_phone)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMS webhook error: %s", exc)
        return False


def send_sms(*, phone: str, message: str) -> bool:
    """Send SMS. Returns True if a provider accepted the message."""
    normalized = _normalize_rwanda_phone(phone)
    if not normalized:
        logger.warning("SMS skipped — invalid phone: %s", phone)
        return False

    provider = (settings.SMS_PROVIDER or "").strip().lower()
    if provider == "africas_talking":
        return _africas_talking_sms(normalized, message)
    if provider == "http":
        return _http_webhook_sms(normalized, message)
    return False


def send_verification_sms(
    *,
    phone: str,
    code: str,
    purpose_label: str,
    lang: str | None = None,
) -> bool:
    lang_key = (lang or "en").lower()
    if lang_key == "rw":
        body = (
            f"FARUMASI: kode yawe yo {purpose_label} ni {code}. "
            f"Irangira mu minota {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES}."
        )
    elif lang_key == "fr":
        body = (
            f"FARUMASI — code {purpose_label}: {code}. "
            f"Expire dans {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} min."
        )
    elif lang_key == "sw":
        body = (
            f"FARUMASI: msimbo wako wa {purpose_label} ni {code}. "
            f"Unaisha kwa dakika {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES}."
        )
    else:
        body = (
            f"FARUMASI verification code ({purpose_label}): {code}. "
            f"Expires in {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes."
        )
    return send_sms(phone=phone, message=body)
