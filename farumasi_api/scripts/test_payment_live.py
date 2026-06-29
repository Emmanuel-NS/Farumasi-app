#!/usr/bin/env python3
"""Smoke-test live payment stack (Render API + optional local MTN OAuth)."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings

BASE = "https://farumasi-app.onrender.com/api/v1"
MTN_TOKEN_URLS = (
    "https://api.mtn.com/oauth/client_credential/accesstoken",
    "https://api.mtn.com/v1/oauth/access_token",
)


async def test_mtn_oauth() -> tuple[str, str]:
    key = (settings.MTN_MADAPI_CONSUMER_KEY or "").strip()
    secret = (settings.MTN_MADAPI_CONSUMER_SECRET or "").strip()
    if not key or not secret:
        return "SKIP", "No MTN keys in local .env — verify Render env vars separately"

    last = "auth failed"
    async with httpx.AsyncClient(timeout=45.0) as client:
        for url in MTN_TOKEN_URLS:
            try:
                if "client_credential" in url:
                    resp = await client.post(
                        url,
                        params={"grant_type": "client_credentials"},
                        data={"client_id": key, "client_secret": secret},
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                    )
                else:
                    resp = await client.post(
                        url,
                        json={
                            "client_id": key,
                            "client_secret": secret,
                            "grant_type": "client_credentials",
                        },
                        headers={
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                        },
                    )
                data = resp.json() if resp.content else {}
                token = data.get("access_token") or data.get("accessToken")
                if resp.status_code < 400 and token:
                    host = url.split("/")[2]
                    return "PASS", f"OAuth OK via {host} (token length {len(token)})"
                last = (
                    data.get("error_description")
                    or data.get("message")
                    or (resp.text or "")[:180]
                )
            except Exception as exc:
                last = str(exc)
    return "FAIL", last


async def test_live_payment_flow() -> tuple[str, str]:
    async with httpx.AsyncClient(timeout=90.0) as client:
        login = await client.post(
            f"{BASE}/auth/login",
            json={
                "email": "patient@farumasi.com",
                "password": "Patient@12345",
                "role": "patient",
            },
        )
        if login.status_code >= 400:
            return "FAIL", f"login {login.status_code}: {(login.text or '')[:200]}"

        token = login.json().get("access_token")
        if not token:
            return "FAIL", "no access_token"

        headers = {"Authorization": f"Bearer {token}"}
        orders_resp = await client.get(f"{BASE}/patients/me/orders", headers=headers)
        if orders_resp.status_code >= 400:
            return "FAIL", f"orders {orders_resp.status_code}"

        items = orders_resp.json()
        if isinstance(items, dict):
            items = items.get("items") or items.get("orders") or []

        target = None
        for order in items:
            payment_status = (
                order.get("payment_status") or order.get("paymentStatus") or ""
            ).lower()
            status = (order.get("status") or "").lower()
            if payment_status in ("pending", "unpaid", "failed") and status != "cancelled":
                target = order
                break
        if not target and items:
            target = items[0]
        if not target:
            return "SKIP", "no patient orders available"

        order_id = target.get("id")
        prior_status = target.get("payment_status") or target.get("paymentStatus")
        pay = await client.post(
            f"{BASE}/patients/me/orders/{order_id}/payments/initiate",
            headers=headers,
            json={
                "phone": "0780000000",
                "payment_method": "mtn_momo",
                "name": "QA Patient",
            },
        )
        try:
            data = pay.json()
            summary = {
                k: data.get(k)
                for k in (
                    "payment_status",
                    "provider",
                    "message",
                    "checkout_url",
                    "external_id",
                )
                if k in data
            }
            body = json.dumps(summary)
        except ValueError:
            body = (pay.text or "")[:500]

        if pay.status_code >= 400:
            return (
                "FAIL",
                f"initiate {pay.status_code} order={order_id} prior={prior_status}: {body}",
            )
        return (
            "PASS",
            f"initiate {pay.status_code} order={order_id} prior={prior_status}: {body}",
        )


async def main() -> None:
    results: list[tuple[str, str, str]] = []

    cfg = httpx.get(f"{BASE}/config/public", timeout=60.0).json().get("payments", {})
    results.append(("config", "PASS", json.dumps(cfg)))

    async with httpx.AsyncClient(timeout=60.0) as client:
        mtn = await client.post(f"{BASE}/webhooks/mtn-madapi", json={})
        results.append(
            (
                "webhook-mtn",
                "PASS" if mtn.status_code == 200 else "FAIL",
                (mtn.text or "")[:120],
            )
        )
        pes = await client.get(
            f"{BASE}/webhooks/pesapal",
            params={"OrderTrackingId": "x", "OrderMerchantReference": "y"},
        )
        results.append(
            (
                "webhook-pesapal",
                "PASS" if pes.status_code == 200 else "FAIL",
                (pes.text or "")[:120],
            )
        )

    oauth_status, oauth_detail = await test_mtn_oauth()
    results.append(("mtn-oauth", oauth_status, oauth_detail))

    pay_status, pay_detail = await test_live_payment_flow()
    results.append(("payment-initiate", pay_status, pay_detail))

    for name, status, detail in results:
        print(f"[{status}] {name}: {detail}")


if __name__ == "__main__":
    asyncio.run(main())
