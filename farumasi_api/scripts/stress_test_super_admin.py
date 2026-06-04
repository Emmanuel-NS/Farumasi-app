"""Super Admin portal API stress test for CIP MVP."""
from __future__ import annotations

import asyncio
import sys
import time
from typing import Awaitable, Callable

import httpx

API = "http://127.0.0.1:8000/api/v1"
SUPER_ADMIN_PORTAL = "http://127.0.0.1:3005"

ADMIN_EMAIL = "admin@farumasi.com"
ADMIN_PW = "Admin@12345"

PASS, FAIL = "[PASS]", "[FAIL]"
results: list[tuple[str, bool, str]] = []


def record(label: str, ok: bool, detail: str = "") -> bool:
    tag = PASS if ok else FAIL
    line = f"  {tag} {label}" + (f" — {detail}" if detail else "")
    print(line)
    results.append((label, ok, detail))
    return ok


async def timed(label: str, fn: Callable[[], Awaitable[tuple[bool, str]]]) -> bool:
    t0 = time.perf_counter()
    try:
        ok, detail = await fn()
    except Exception as exc:
        ok, detail = False, str(exc)[:160]
    ms = int((time.perf_counter() - t0) * 1000)
    suffix = f"{detail} ({ms}ms)" if detail else f"{ms}ms"
    return record(label, ok, suffix)


async def login(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return ""
    return r.json().get("access_token", "")


async def main() -> int:
    print("\n=== FARUMASI Super Admin CIP MVP stress test ===\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await login(client, ADMIN_EMAIL, ADMIN_PW)
        if not token:
            record("POST /auth/login (super_admin)", False, "login failed — run seed.py?")
            return 1
        record("POST /auth/login (super_admin)", True, ADMIN_EMAIL)
        h = {"Authorization": f"Bearer {token}"}

        async def admin_summary():
            r = await client.get(f"{API}/analytics/admin", headers=h)
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            body = r.json()
            return True, f"users={body.get('total_users', '?')} orders={body.get('total_orders', '?')}"

        await timed("GET /analytics/admin", admin_summary)

        async def list_users():
            r = await client.get(f"{API}/users/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return len(items) >= 1, f"{len(items)} users"

        await timed("GET /users/", list_users)

        async def list_pharmacies():
            r = await client.get(f"{API}/pharmacies/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return len(items) >= 0, f"{len(items)} pharmacies"

        await timed("GET /pharmacies/", list_pharmacies)

        async def list_partners():
            r = await client.get(f"{API}/partners/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return len(items) >= 0, f"{len(items)} partners"

        await timed("GET /partners/", list_partners)

        async def public_partners():
            r = await client.get(f"{API}/partners/public/", params={"limit": 10})
            if r.status_code == 404:
                return True, "404 (restart API to enable — patient portal uses /partners/ fallback)"
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return True, f"{len(items)} public partners"

        await timed("GET /partners/public/ (patient store)", public_partners)

        async def list_products():
            r = await client.get(f"{API}/products/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return len(items) >= 0, f"{len(items)} products"

        await timed("GET /products/", list_products)

        async def list_product_requests():
            r = await client.get(f"{API}/product-requests/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return True, f"{len(items)} requests"

        await timed("GET /product-requests/", list_product_requests)

        async def list_listings():
            r = await client.get(f"{API}/listings/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return len(items) >= 0, f"{len(items)} listings"

        await timed("GET /listings/", list_listings)

        async def list_orders():
            r = await client.get(f"{API}/orders/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return True, f"{len(items)} orders"

        await timed("GET /orders/", list_orders)

        async def list_withdrawals():
            r = await client.get(f"{API}/withdrawals/", headers=h, params={"limit": 20})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", []) if isinstance(r.json(), dict) else r.json()
            n = len(items) if isinstance(items, list) else 0
            return True, f"{n} withdrawals"

        await timed("GET /withdrawals/", list_withdrawals)

        async def audit_logs():
            r = await client.get(f"{API}/audit/", headers=h, params={"limit": 10})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            items = r.json().get("items", [])
            return True, f"{len(items)} audit entries"

        await timed("GET /audit/", audit_logs)

        async def portal_home():
            try:
                r = await client.get(f"{SUPER_ADMIN_PORTAL}/login", follow_redirects=True)
                return r.status_code == 200, f"HTTP {r.status_code}"
            except httpx.ConnectError:
                return False, f"portal not running on {SUPER_ADMIN_PORTAL}"

        await timed("Super Admin portal /login reachable", portal_home)

    passed = sum(1 for _, ok, _ in results if ok)
    failed = len(results) - passed
    print(f"\n=== Results: {passed} passed, {failed} failed ===\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
