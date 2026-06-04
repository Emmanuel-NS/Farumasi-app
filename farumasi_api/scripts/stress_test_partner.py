"""Partner portal API + frontend stress test for FARUMASI."""
from __future__ import annotations

import asyncio
import sys
import time
from typing import Callable, Awaitable

import httpx

API = "http://127.0.0.1:8000/api/v1"
PARTNER_PORTAL = "http://127.0.0.1:3004"
PATIENT_PORTAL = "http://127.0.0.1:3002"
PHARMACIST_PORTAL = "http://127.0.0.1:3003"

PARTNER_EMAIL = "partner_admin@farumasi.com"
PARTNER_PW = "Partner@12345"
PATIENT_EMAIL = "patient@farumasi.com"
PATIENT_PW = "Patient@12345"
PHARM_EMAIL = "pharmacist@farumasi.com"
PHARM_PW = "Pharmacist@12345"

PASS, FAIL, WARN = "[PASS]", "[FAIL]", "[WARN]"
results: list[tuple[str, bool, str, str]] = []  # label, ok, detail, severity pass|fail|warn


def record(label: str, ok: bool, detail: str = "", *, warn: bool = False) -> bool:
    tag = WARN if warn else (PASS if ok else FAIL)
    line = f"  {tag} {label}" + (f" — {detail}" if detail else "")
    print(line)
    results.append((label, ok, detail, "warn" if warn else ("pass" if ok else "fail")))
    return ok


async def timed(label: str, fn: Callable[[], Awaitable[tuple[bool, str]]], *, warn: bool = False) -> bool:
    t0 = time.perf_counter()
    try:
        ok, detail = await fn()
    except Exception as exc:
        ok, detail = False, str(exc)[:160]
    ms = int((time.perf_counter() - t0) * 1000)
    suffix = f"{detail} ({ms}ms)" if detail else f"{ms}ms"
    return record(label, ok, suffix, warn=warn)


async def login(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return ""
    return r.json().get("access_token", "")


async def partner_api_stress(client: httpx.AsyncClient, h: dict) -> str | None:
    """Run partner API workflows. Returns created listing id if any (for cleanup)."""
    created_listing_id: str | None = None

    async def get_profile():
        r = await client.get(f"{API}/partners/me", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        body = r.json()
        return bool(body.get("id")), f"name={body.get('name', '?')}"

    await timed("GET /partners/me", get_profile)

    async def list_products():
        r = await client.get(
            f"{API}/products/",
            headers=h,
            params={"only_with_listings": False, "limit": 50, "offset": 0},
        )
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        items = r.json().get("items", [])
        return len(items) > 0, f"{len(items)} approved products"

    await timed("GET /products/ (catalogue)", list_products)

    async def list_my_listings():
        r = await client.get(f"{API}/partners/me/listings", headers=h, params={"limit": 100})
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        body = r.json()
        return True, f"{body.get('total', len(body.get('items', [])))} listings"

    await timed("GET /partners/me/listings", list_my_listings)

    # Pick a product not yet listed (or any product for create/update/delete cycle)
    r_prod = await client.get(
        f"{API}/products/",
        headers=h,
        params={"only_with_listings": False, "limit": 100},
    )
    r_list = await client.get(f"{API}/partners/me/listings", headers=h, params={"limit": 200})
    products = r_prod.json().get("items", []) if r_prod.status_code == 200 else []
    listed_pids = {x["product_id"] for x in r_list.json().get("items", [])} if r_list.status_code == 200 else set()
    candidate = next((p for p in products if p["id"] not in listed_pids), products[0] if products else None)

    if candidate:
        payload = {
            "product_id": candidate["id"],
            "price": 9999.99,
            "stock_quantity": 42,
            "availability_status": "available",
            "fulfillment_time_minutes": 45,
        }
        if candidate.get("allows_partial_selling"):
            payload["unit_price"] = 99.99

        async def create_listing():
            nonlocal created_listing_id
            r = await client.post(f"{API}/partners/me/listings", headers=h, json=payload)
            if r.status_code not in (200, 201):
                return False, f"HTTP {r.status_code} {r.text[:80]}"
            created_listing_id = r.json().get("id")
            return bool(created_listing_id), f"id={created_listing_id[:8]}… product={candidate['name'][:30]}"

        await timed("POST /partners/me/listings (create)", create_listing)

        if created_listing_id:
            lid = created_listing_id

            async def get_listing_public():
                r = await client.get(f"{API}/listings/{lid}", headers=h)
                if r.status_code != 200:
                    return False, f"HTTP {r.status_code}"
                return r.json().get("id") == lid, "public GET /listings/{id}"

            await timed("GET /listings/{id}", get_listing_public)

            async def patch_listing():
                r = await client.patch(
                    f"{API}/partners/me/listings/{lid}",
                    headers=h,
                    json={"price": 8888.88, "stock_quantity": 50},
                )
                if r.status_code != 200:
                    return False, f"HTTP {r.status_code} {r.text[:80]}"
                body = r.json()
                ok = body.get("price") == 8888.88 and body.get("stock_quantity") == 50
                return ok, f"price={body.get('price')} stock={body.get('stock_quantity')}"

            await timed("PATCH /partners/me/listings/{id}", patch_listing)

            async def set_availability():
                r = await client.patch(
                    f"{API}/partners/me/listings/{lid}",
                    headers=h,
                    json={"availability_status": "unavailable"},
                )
                if r.status_code != 200:
                    return False, f"HTTP {r.status_code}"
                return r.json().get("availability_status") == "unavailable", "unavailable"

            await timed("PATCH availability via /partners/me/listings/{id}", set_availability)

            async def delete_listing():
                nonlocal created_listing_id
                r = await client.delete(f"{API}/partners/me/listings/{lid}", headers=h)
                if r.status_code not in (200, 204):
                    return False, f"HTTP {r.status_code}"
                created_listing_id = None
                return True, "deleted test listing"

            await timed("DELETE /partners/me/listings/{id}", delete_listing)
    else:
        record("Listing CRUD cycle", False, "no products in catalogue")

    async def list_orders():
        r = await client.get(f"{API}/partners/me/orders", headers=h, params={"limit": 20})
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        body = r.json()
        return True, f"{body.get('total', len(body.get('items', [])))} orders"

    await timed("GET /partners/me/orders", list_orders)

    r_orders = await client.get(f"{API}/partners/me/orders", headers=h, params={"limit": 5})
    order_items = r_orders.json().get("items", []) if r_orders.status_code == 200 else []
    if order_items:
        oid = order_items[0]["id"]
        cur_status = order_items[0].get("order_status")

        async def get_order_detail():
            r = await client.get(f"{API}/orders/{oid}", headers=h)
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            return True, f"status={r.json().get('order_status')}"

        await timed("GET /orders/{id} (detail)", get_order_detail)

        # Only transition if not terminal — patch back if needed
        next_status = "preparing" if cur_status in ("pending", "processing") else cur_status

        async def patch_order_status():
            r = await client.patch(
                f"{API}/partners/me/orders/{oid}/status",
                headers=h,
                json={"order_status": next_status},
            )
            if r.status_code != 200:
                return False, f"HTTP {r.status_code} {r.text[:80]}"
            return r.json().get("order_status") == next_status, f"-> {next_status}"

        await timed("PATCH /partners/me/orders/{id}/status", patch_order_status)
    else:
        record("Order status update", True, "skipped — no partner orders", warn=True)

    async def revenue_summary():
        r = await client.get(f"{API}/partners/me/revenue/summary", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        b = r.json()
        return True, f"total={b.get('total_revenue', b.get('total', '?'))} available={b.get('available_balance', '?')}"

    await timed("GET /partners/me/revenue/summary", revenue_summary)

    async def revenue_records():
        r = await client.get(f"{API}/partners/me/revenue", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        data = r.json()
        count = len(data) if isinstance(data, list) else len(data.get("items", []))
        return True, f"{count} records"

    await timed("GET /partners/me/revenue", revenue_records)

    async def withdrawals_list():
        r = await client.get(f"{API}/partners/me/withdrawals", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        data = r.json()
        count = len(data) if isinstance(data, list) else 0
        return True, f"{count} withdrawals"

    await timed("GET /partners/me/withdrawals", withdrawals_list)

    async def notifications_unread():
        r = await client.get(f"{API}/notifications/unread-count", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        return True, f"unread={r.json().get('unread', '?')}"

    await timed("GET /notifications/unread-count", notifications_unread)

    async def notifications_list():
        r = await client.get(f"{API}/notifications/", headers=h, params={"limit": 10})
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        body = r.json()
        return True, f"{len(body.get('items', []))} recent"

    await timed("GET /notifications/", notifications_list)

    async def product_requests():
        r = await client.get(f"{API}/product-requests/", headers=h, params={"limit": 20})
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        body = r.json()
        return True, f"{body.get('total', len(body.get('items', [])))} requests"

    await timed("GET /product-requests/", product_requests)

    # Create + delete draft product request (stress write path)
    draft_id: str | None = None

    async def create_product_request():
        nonlocal draft_id
        r = await client.post(
            f"{API}/product-requests/",
            headers=h,
            json={
                "product_name": f"Stress Test Product {int(time.time())}",
                "product_type": "medicine",
                "category": "Analgesic",
                "manufacturer": "Test Labs",
                "proposed_price": 1500,
            },
        )
        if r.status_code not in (200, 201):
            return False, f"HTTP {r.status_code} {r.text[:80]}"
        draft_id = r.json().get("id")
        return bool(draft_id), f"draft id={str(draft_id)[:8]}…"

    await timed("POST /product-requests/ (create draft)", create_product_request)

    if draft_id:
        async def patch_request():
            r = await client.patch(
                f"{API}/product-requests/{draft_id}",
                headers=h,
                json={"description": "Stress test draft — do not approve"},
            )
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            return True, "patched description"

        await timed("PATCH /product-requests/{id}", patch_request)

    async def audit_logs():
        r = await client.get(f"{API}/audit/", headers=h, params={"limit": 20})
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        data = r.json()
        count = len(data) if isinstance(data, list) else len(data.get("items", []))
        return True, f"{count} log entries"

    await timed("GET /audit/", audit_logs)

    async def users_me():
        r = await client.get(f"{API}/users/me", headers=h)
        if r.status_code != 200:
            return False, f"HTTP {r.status_code}"
        b = r.json()
        return b.get("role") == "partner_company_admin", f"role={b.get('role')}"

    await timed("GET /users/me", users_me)

    # Known bug: settings page calls pharmacy endpoint
    async def pharmacies_me_bug():
        r = await client.get(f"{API}/pharmacies/me", headers=h)
        if r.status_code == 404:
            return False, "HTTP 404 — settings page will fail (uses /pharmacies/me)"
        if r.status_code == 403:
            return False, "HTTP 403 — partner cannot access /pharmacies/me"
        return r.status_code == 200, f"HTTP {r.status_code} (unexpected for partner)"

    await timed("GET /pharmacies/me (settings bug check)", pharmacies_me_bug, warn=True)

    return created_listing_id


async def concurrent_layout_poll(client: httpx.AsyncClient, h: dict, rounds: int = 5) -> None:
    """Simulate portal layout polling: 4 endpoints × concurrent bursts."""

    async def poll_once(round_num: int) -> tuple[bool, str]:
        endpoints = [
            ("notifications/unread-count", client.get(f"{API}/notifications/unread-count", headers=h)),
            ("notifications/", client.get(f"{API}/notifications/", headers=h, params={"limit": 5})),
            ("revenue/summary", client.get(f"{API}/partners/me/revenue/summary", headers=h)),
            ("product-requests/", client.get(f"{API}/product-requests/", headers=h, params={"status": "submitted", "limit": 5})),
        ]
        tasks = [asyncio.create_task(coro) for _, coro in endpoints]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        errors = []
        for (name, _), resp in zip(endpoints, responses):
            if isinstance(resp, Exception):
                errors.append(f"{name}: {resp}")
            elif resp.status_code >= 400:
                errors.append(f"{name}: HTTP {resp.status_code}")
        ok = len(errors) == 0
        detail = f"round {round_num + 1}/{rounds}" + (f" errors={errors}" if errors else " all OK")
        return ok, detail

    print("\n--- Concurrent layout poll stress (5 rounds × 4 endpoints) ---")
    t0 = time.perf_counter()
    for i in range(rounds):
        await timed(f"Layout poll burst {i + 1}", lambda i=i: poll_once(i))
    total_ms = int((time.perf_counter() - t0) * 1000)
    record("Layout poll total", True, f"{rounds} rounds in {total_ms}ms")


async def rapid_dashboard_load(client: httpx.AsyncClient, h: dict) -> None:
    """Hit all dashboard data endpoints in parallel (simulates dashboard mount)."""
    print("\n--- Dashboard parallel load ---")

    async def dashboard_burst():
        coros = [
            client.get(f"{API}/partners/me/listings", headers=h, params={"limit": 100}),
            client.get(f"{API}/partners/me/orders", headers=h, params={"limit": 10}),
            client.get(f"{API}/partners/me/revenue/summary", headers=h),
            client.get(f"{API}/partners/me/orders", headers=h, params={"status": "pending", "limit": 5}),
            client.get(f"{API}/products/", headers=h, params={"only_with_listings": False, "limit": 5}),
        ]
        responses = await asyncio.gather(*coros, return_exceptions=True)
        bad = sum(
            1 for r in responses
            if isinstance(r, Exception) or (hasattr(r, "status_code") and r.status_code >= 400)
        )
        return bad == 0, f"{len(coros) - bad}/{len(coros)} OK"

    for i in range(3):
        await timed(f"Dashboard burst {i + 1}/3", dashboard_burst)


async def frontend_pages() -> None:
    print("\n--- Partner portal page loads ---")
    routes = [
        "/login",
        "/dashboard",
        "/products/catalogue",
        "/products/listed",
        "/inventory",
        "/orders",
        "/analytics",
        "/revenue",
        "/customers",
        "/notifications",
        "/requests",
        "/compliance",
        "/team",
        "/activity",
        "/settings",
        "/support",
    ]

    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as fe:
        for path in routes:
            url = f"{PARTNER_PORTAL}{path}"

            async def load(u=url, p=path):
                try:
                    r = await fe.get(u)
                    # 200 or redirect to login is acceptable for protected routes
                    ok = r.status_code < 500
                    return ok, f"HTTP {r.status_code}"
                except httpx.ConnectError:
                    return False, "portal not running"
                except httpx.ReadTimeout:
                    return False, "timeout (>120s)"

            await timed(f"Page {path}", load)

    print("\n--- Patient + pharmacist smoke (quick) ---")
    smoke = [
        ("patient /store", f"{PATIENT_PORTAL}/store"),
        ("patient /orders", f"{PATIENT_PORTAL}/orders"),
        ("pharmacist /requests", f"{PHARMACIST_PORTAL}/requests"),
        ("pharmacist /orders", f"{PHARMACIST_PORTAL}/orders"),
    ]
    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as fe:
        for name, url in smoke:
            async def load(u=url):
                try:
                    r = await fe.get(u)
                    return r.status_code < 500, f"HTTP {r.status_code}"
                except Exception as exc:
                    return False, str(exc)[:80]

            await timed(name, load)


async def main() -> int:
    print("\n=== FARUMASI Partner Portal Stress Test ===\n")

    async with httpx.AsyncClient(timeout=30.0) as client:
        async def api_health():
            r = await client.get(f"{API}/openapi.json")
            return r.status_code == 200, f"HTTP {r.status_code}"

        if not await timed("API health", api_health):
            print("\nStart API: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000")
            return 1

        print("\n--- Partner auth ---")
        token = await login(client, PARTNER_EMAIL, PARTNER_PW)
        if not record("Partner login", bool(token)):
            return 1
        h = {"Authorization": f"Bearer {token}"}

        print("\n--- Partner API workflows ---")
        leftover = await partner_api_stress(client, h)
        if leftover:
            await client.delete(f"{API}/partners/me/listings/{leftover}", headers=h)

        await concurrent_layout_poll(client, h)
        await rapid_dashboard_load(client, h)

        # Wrong-role login checks
        print("\n--- Auth boundary checks ---")
        pt = await login(client, PATIENT_EMAIL, PATIENT_PW)
        if pt:
            r = await client.get(f"{API}/partners/me/listings", headers={"Authorization": f"Bearer {pt}"})
            record("Patient cannot list partner listings", r.status_code in (401, 403), f"HTTP {r.status_code}")

    await frontend_pages()

    passed = sum(1 for _, ok, _, sev in results if ok and sev != "warn")
    failed = sum(1 for _, ok, _, sev in results if not ok and sev == "fail")
    warned = sum(1 for _, _, _, sev in results if sev == "warn")
    print(f"\n=== Summary: {passed} passed, {failed} failed, {warned} warnings ===\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
