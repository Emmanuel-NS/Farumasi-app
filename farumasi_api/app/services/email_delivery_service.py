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


def _verification_email_bodies(
    *, full_name: str, code: str, purpose_label: str
) -> tuple[str, str]:
    minutes = settings.EMAIL_VERIFICATION_EXPIRE_MINUTES
    text = (
        f"Hello {full_name},\n\n"
        f"Your FARUMASI verification code for {purpose_label} is:\n\n"
        f"  {code}\n\n"
        f"This code expires in {minutes} minutes. "
        f"If you did not request this, ignore this email.\n\n"
        f"— FARUMASI"
    )
    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1E9E68,#0F5132);padding:28px 24px;text-align:center;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">FARUMASI</div>
          <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:6px;">{purpose_label}</div>
        </td></tr>
        <tr><td style="padding:28px 24px 12px;text-align:center;">
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Hello {full_name},</p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.5;">Your verification code:</p>
          <div style="display:inline-block;background:#ecfdf5;border:2px dashed #1E9E68;border-radius:16px;padding:20px 32px;margin:0 auto 12px;">
            <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#0F5132;font-family:Consolas,Monaco,monospace;user-select:all;-webkit-user-select:all;">{code}</div>
          </div>
          <p style="margin:8px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
            Tap and hold the code to copy it, then paste it in the app.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 28px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
            Expires in <strong>{minutes} minutes</strong>. If you did not request this, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return text, html


def _send_via_brevo_api(
    *,
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> bool:
    if not _brevo_api_configured():
        return False
    payload: dict = {
        "sender": {"name": settings.SMTP_FROM_NAME, "email": _sender_address()},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "textContent": body,
    }
    if html_body:
        payload["htmlContent"] = html_body
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


def _send_email(
    *, to_email: str, to_name: str, subject: str, body: str, html_body: str | None = None
) -> bool:
    if _brevo_api_configured() and _send_via_brevo_api(
        to_email=to_email,
        to_name=to_name,
        subject=subject,
        body=body,
        html_body=html_body,
    ):
        return True

    if _smtp_configured():
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = _sender_address()
        msg["To"] = to_email
        msg.set_content(body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")
        if _send_smtp_message(msg):
            return True

    return False


def send_owner_verification_email(*, to_email: str, full_name: str, code: str, purpose_label: str) -> bool:
    """Send verification email. Returns True if sent, False if email is not configured."""
    subject = f"FARUMASI verification code — {purpose_label}"
    body, html = _verification_email_bodies(
        full_name=full_name, code=code, purpose_label=purpose_label
    )

    if _send_email(
        to_email=to_email,
        to_name=full_name,
        subject=subject,
        body=body,
        html_body=html,
    ):
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
