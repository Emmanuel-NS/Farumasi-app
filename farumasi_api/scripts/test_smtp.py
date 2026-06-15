"""Quick Brevo SMTP check — run from farumasi_api: python scripts/test_smtp.py [to_email]"""
from __future__ import annotations

import smtplib
import sys
from email.message import EmailMessage

from app.core.config import settings


def main() -> int:
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    user = settings.SMTP_USER
    password = settings.SMTP_PASSWORD
    from_addr = settings.SMTP_FROM_EMAIL or user or "noreply@farumasi.com"
    to_addr = (sys.argv[1] if len(sys.argv) > 1 else user or "").strip()

    print("Brevo SMTP check")
    print(f"  host: {host}")
    print(f"  port: {port}")
    print(f"  user set: {bool(user)} (len={len(user or '')})")
    print(f"  password set: {bool(password)} (len={len(password or '')})")
    print(f"  from: {from_addr}")

    if not host or not user or not password:
        print("\nFAIL: Save farumasi_api/.env with SMTP_USER and SMTP_PASSWORD, then retry.")
        return 1

    if len(password) < 20 and not password.startswith("xsmtpsib-"):
        print("\nWARN: SMTP_PASSWORD looks too short — paste the FULL xsmtpsib-… key from Brevo.")

    try:
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(user, password)
        print("\nOK: SMTP login succeeded.")
    except smtplib.SMTPAuthenticationError:
        print("\nFAIL: Authentication failed — check SMTP_USER (Brevo login) and full SMTP key.")
        return 2
    except Exception as exc:  # noqa: BLE001
        print(f"\nFAIL: {type(exc).__name__}: {exc}")
        return 3

    if not to_addr or "@" not in to_addr:
        print("Skip send test (pass recipient email: python scripts/test_smtp.py you@email.com)")
        return 0

    msg = EmailMessage()
    msg["Subject"] = "FARUMASI SMTP test"
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(
        "If you received this, Brevo SMTP is working for FARUMASI API.\n\n— test script"
    )

    try:
        with smtplib.SMTP(host, port, timeout=25) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
                server.ehlo()
            server.login(user, password)
            server.send_message(msg)
        print(f"OK: Test email sent to {to_addr}. Check inbox and spam.")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"\nFAIL send: {type(exc).__name__}: {exc}")
        print("If login worked but send failed, verify SMTP_FROM_EMAIL in Brevo → Senders.")
        return 4


if __name__ == "__main__":
    raise SystemExit(main())
