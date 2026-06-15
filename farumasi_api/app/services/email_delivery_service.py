from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_SMTP_TIMEOUT_SECONDS = 8
_BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _brevo_api_configured() -> bool:
    return bool(settings.BREVO_API_KEY and settings.SMTP_FROM_EMAIL)


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def email_config_issue() -> str | None:
    """Human-readable hint when email env vars are missing on the server."""
    if settings.BREVO_API_KEY:
        if not settings.SMTP_FROM_EMAIL:
            return "SMTP_FROM_EMAIL is not set (required as the Brevo sender address)."
        return None
    if not settings.SMTP_HOST:
        return "Set BREVO_API_KEY (recommended on Render) or SMTP_HOST for email."
    if not settings.SMTP_USER:
        return "SMTP_USER is not set on the server."
    if not settings.SMTP_PASSWORD:
        return "SMTP_PASSWORD is not set on the server."
    return None


def smtp_config_issue() -> str | None:
    """Backward-compatible alias."""
    return email_config_issue()


def _sender_address() -> str:
    return settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@farumasi.com"


def _send_via_brevo_api(
    *,
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
) -> bool:
    if not _brevo_api_configured():
        return False
    payload = {
        "sender": {"name": settings.SMTP_FROM_NAME, "email": _sender_address()},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "textContent": body,
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                _BREVO_API_URL,
                headers={
                    "api-key": settings.BREVO_API_KEY,
                    "accept": "application/json",
                    "content-type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("Brevo API send failed: %s", exc)
        return False


def _send_smtp_message(msg: EmailMessage) -> bool:
    if not _smtp_configured():
        return False
    try:
        with smtplib.SMTP(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=_SMTP_TIMEOUT_SECONDS
        ) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("SMTP send failed: %s", exc)
        return False


def _send_email(*, to_email: str, to_name: str, subject: str, body: str) -> bool:
    if _brevo_api_configured() and _send_via_brevo_api(
        to_email=to_email, to_name=to_name, subject=subject, body=body
    ):
        return True

    if _smtp_configured():
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = _sender_address()
        msg["To"] = to_email
        msg.set_content(body)
        if _send_smtp_message(msg):
            return True

    return False


def send_owner_verification_email(*, to_email: str, full_name: str, code: str, purpose_label: str) -> bool:
    """Send verification email. Returns True if sent, False if email is not configured."""
    subject = f"FARUMASI verification code — {purpose_label}"
    body = (
        f"Hello {full_name},\n\n"
        f"Your FARUMASI verification code is: {code}\n\n"
        f"This code expires in {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes. "
        f"If you did not request this change, ignore this email and contact support.\n\n"
        f"— FARUMASI"
    )

    if _send_email(to_email=to_email, to_name=full_name, subject=subject, body=body):
        logger.info("Sent verification email to %s", to_email)
        return True

    logger.warning(
        "Email not sent — verification code for %s (%s): %s",
        to_email,
        purpose_label,
        code,
    )
    return False


def send_data_export_email(*, to_email: str, full_name: str, download_path: str) -> bool:
    subject = "FARUMASI — your personal data export is ready"
    body = (
        f"Hello {full_name},\n\n"
        f"Your requested data export is ready.\n"
        f"Download: {download_path}\n\n"
        f"This link is available on the API server for 48 hours. "
        f"If you did not request this export, contact support immediately.\n\n"
        f"— FARUMASI"
    )

    if _send_email(to_email=to_email, to_name=full_name, subject=subject, body=body):
        logger.info("Sent data export email to %s", to_email)
        return True

    logger.warning("Email not sent — data export for %s at %s", to_email, download_path)
    return False
