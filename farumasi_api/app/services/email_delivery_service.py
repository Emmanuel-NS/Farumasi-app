from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_owner_verification_email(*, to_email: str, full_name: str, code: str, purpose_label: str) -> bool:
    """Send verification email. Returns True if sent, False if SMTP is not configured."""
    subject = f"FARUMASI verification code — {purpose_label}"
    body = (
        f"Hello {full_name},\n\n"
        f"Your FARUMASI verification code is: {code}\n\n"
        f"This code expires in {settings.EMAIL_VERIFICATION_EXPIRE_MINUTES} minutes. "
        f"If you did not request this change, ignore this email and contact support.\n\n"
        f"— FARUMASI"
    )

    if settings.SMTP_HOST:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@farumasi.com"
        msg["To"] = to_email
        msg.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Sent verification email to %s", to_email)
        return True

    logger.warning(
        "SMTP not configured — verification code for %s (%s): %s",
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

    if settings.SMTP_HOST:
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER or "noreply@farumasi.com"
        msg["To"] = to_email
        msg.set_content(body)
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Sent data export email to %s", to_email)
        return True

    logger.warning("SMTP not configured — data export for %s at %s", to_email, download_path)
    return False
