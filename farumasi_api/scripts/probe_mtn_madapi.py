#!/usr/bin/env python3
"""Smoke-test MTN MADAPI OAuth (developers.mtn.com consumer credentials).

Usage (from farumasi_api/):
  python scripts/probe_mtn_madapi.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings
from app.services.payments.mtn_madapi_service import MtnMadapiService


async def main() -> None:
    if not settings.MTN_MADAPI_CONSUMER_KEY or not settings.MTN_MADAPI_CONSUMER_SECRET:
        print("Set MTN_MADAPI_CONSUMER_KEY and MTN_MADAPI_CONSUMER_SECRET in .env first.", file=sys.stderr)
        sys.exit(1)

    svc = MtnMadapiService()
    print(f"Country: {settings.MTN_MADAPI_COUNTRY_CODE}")
    print(f"Base URL: {settings.MTN_MADAPI_BASE_URL}")
    print("Requesting OAuth token…")

    try:
        token = await svc._access_token()
        print(f"OK — token received ({len(token)} chars, prefix {token[:12]}…)")
    except Exception as exc:
        print(f"FAILED: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
