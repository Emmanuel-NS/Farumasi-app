#!/usr/bin/env python3
"""Register Pesapal IPN URL and print PESAPAL_IPN_ID for .env.

Usage (from farumasi_api/):
  python scripts/register_pesapal_ipn.py
  python scripts/register_pesapal_ipn.py --url https://api.yourdomain.com/api/v1/webhooks/pesapal

Requires PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in .env.
Your IPN URL must be publicly reachable (use ngrok/Cloudflare Tunnel for local testing).
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.services.payments.pesapal_service import PesapalService


async def main() -> None:
    parser = argparse.ArgumentParser(description="Register Pesapal IPN and print ipn_id")
    parser.add_argument(
        "--url",
        help="Public IPN URL (default: API_PUBLIC_URL + /api/v1/webhooks/pesapal)",
    )
    args = parser.parse_args()

    if not settings.PESAPAL_CONSUMER_KEY or not settings.PESAPAL_CONSUMER_SECRET:
        print("Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in .env first.", file=sys.stderr)
        sys.exit(1)

    if args.url:
        settings.PESAPAL_IPN_URL = args.url

    ipn_url = args.url or PesapalService()._ipn_callback_url()
    print(f"Pesapal env: {settings.PESAPAL_ENV}")
    print(f"Registering IPN URL: {ipn_url}")

    svc = PesapalService()
    ipn_id = await svc.get_ipn_id()
    print()
    print("Success. Add to farumasi_api/.env:")
    print(f"PESAPAL_IPN_ID={ipn_id}")
    print(f"PESAPAL_IPN_URL={ipn_url}")
    print(f"API_PUBLIC_URL={settings.API_PUBLIC_URL}")
    print("PAYMENT_MODE=live")


if __name__ == "__main__":
    asyncio.run(main())
