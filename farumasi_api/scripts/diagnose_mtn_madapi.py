#!/usr/bin/env python3
"""Diagnose MTN MADAPI OAuth + payment request (developers.mtn.com)."""
from __future__ import annotations

import asyncio
import json
import sys
import uuid
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings


def _env_get(name: str) -> str:
    val = (getattr(settings, name, None) or "").strip()
    if val:
        return val
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.startswith(f"{name}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

_OAUTH_URLS = (
    "https://api.mtn.com/v1/oauth/access_token",
    "https://api.mtn.com/oauth/client_credential/accesstoken",
)
_BASE_URLS = (
    "https://api.mtn.com/v1",
    "https://rwanda.api.mtn.com/v1",
)


async def _fetch_token(client: httpx.AsyncClient, oauth_url: str, key: str, secret: str) -> tuple[int, dict]:
    if oauth_url.endswith("/access_token"):
        resp = await client.post(
            oauth_url,
            params={"grant_type": "client_credentials"},
            data={"client_id": key, "client_secret": secret},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    else:
        resp = await client.post(
            oauth_url,
            params={"grant_type": "client_credentials"},
            data={"client_id": key, "client_secret": secret},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    try:
        body = resp.json() if resp.content else {}
    except ValueError:
        body = {"raw": (resp.text or "")[:300]}
    return resp.status_code, body


async def _try_payment(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    token: str,
    msisdn: str = "250780000000",
) -> tuple[int, str]:
    callback = _env_get("MTN_MADAPI_CALLBACK_URL")
    tx = f"DIAG{uuid.uuid4().hex[:12]}"
    payload = {
        "payer": {
            "payerIdType": "MSISDN",
            "payerId": msisdn,
            "payerName": "FARUMASI Test",
        },
        "payee": [
            {
                "totalAmount": {"amount": "100", "units": "RWF"},
                "payeeNote": "FARUMASI diagnostic",
                "callbackURL": callback
                or "https://farumasi-app.onrender.com/api/v1/webhooks/mtn-madapi",
            }
        ],
        "externalTransactionId": tx,
        "correlatorId": tx,
        "description": "FARUMASI diagnostic",
        "callbackURL": callback
        or "https://farumasi-app.onrender.com/api/v1/webhooks/mtn-madapi",
        "transactionType": "Payment",
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "countryCode": (_env_get("MTN_MADAPI_COUNTRY_CODE") or "RW").upper(),
        "transactionId": tx,
    }
    target = _env_get("MTN_MADAPI_TARGET_SYSTEM")
    if target:
        headers["targetSystem"] = target
        payload["targetSystem"] = target

    resp = await client.post(f"{base_url.rstrip('/')}/payments", json=payload, headers=headers)
    return resp.status_code, (resp.text or "")[:400]


async def main() -> None:
    key = _env_get("MTN_MADAPI_CONSUMER_KEY")
    secret = _env_get("MTN_MADAPI_CONSUMER_SECRET")
    if not key or not secret:
        print("FAIL: Set MTN_MADAPI_CONSUMER_KEY and MTN_MADAPI_CONSUMER_SECRET in .env")
        sys.exit(1)

    print("MTN MADAPI diagnostic")
    print(f"  country={_env_get('MTN_MADAPI_COUNTRY_CODE') or 'RW'}")
    callback = _env_get("MTN_MADAPI_CALLBACK_URL")
    print(f"  callback={callback or '(default)'}")

    best_token = ""
    best_products: list[str] = []
    best_oauth = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        for oauth_url in _OAUTH_URLS:
            status, body = await _fetch_token(client, oauth_url, key, secret)
            products = body.get("api_product_list_json") or []
            if isinstance(products, str):
                try:
                    products = json.loads(products)
                except ValueError:
                    products = [products]
            token = body.get("access_token") or body.get("accessToken") or ""
            print(f"\nOAuth {oauth_url}")
            print(f"  HTTP {status}")
            print(f"  products={products or body.get('api_product_list') or '(none)'}")
            if status < 400 and token:
                best_token = str(token)
                best_products = list(products) if isinstance(products, list) else []
                best_oauth = oauth_url
            else:
                err = body.get("error_description") or body.get("error") or body.get("raw")
                if err:
                    print(f"  error={err}")

        if not best_token:
            print("\nFAIL: Could not obtain OAuth token from any endpoint.")
            sys.exit(1)

        payment_products = [
            p
            for p in best_products
            if "payment" in str(p).lower() or "momo" in str(p).lower()
        ]
        if not payment_products:
            print(
                "\nWARN: Token products do NOT include Payments V1. "
                "Payment calls will likely return 401 Unauthorised."
            )
            print("  Enable Payments V1 for Rwanda on developers.mtn.com for this app.")
        else:
            print(f"\nOK: Token includes payment product(s): {payment_products}")

        for base in _BASE_URLS:
            status, text = await _try_payment(client, base_url=base, token=best_token)
            print(f"\nPOST {base}/payments")
            print(f"  HTTP {status}")
            print(f"  body={text}")
            if status < 400:
                print("\nPASS: Payment request accepted by MTN.")
                sys.exit(0)

    print("\nFAIL: All payment attempts rejected.")
    print("Next steps:")
    print("  1. developers.mtn.com → your app → confirm Payments V1 is Approved for Rwanda")
    print("  2. If app is test/staging only, you may need production go-live keys from MTN")
    print("  3. Email mmitsupport.RW@mtn.com with api_product_list from OAuth response")
    sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
