"""
Partner portal E2E: API workflows + Playwright UI navigation.

Requires:
  API on :8000, partner portal on :3004 (use localhost for Playwright)

  python scripts/test_partner_portal_e2e.py
"""
from __future__ import annotations

import asyncio
import json
import re
import sys

import httpx

API = "http://127.0.0.1:8000/api/v1"
PORTAL = "http://localhost:3004"

PARTNER_EMAIL = "partner_admin@farumasi.com"
PARTNER_PW = "Partner@12345"

PASS, FAIL = "[PASS]", "[FAIL]"
results: list[tuple[str, bool, str]] = []


def record(label: str, ok: bool, detail: str = "") -> None:
    tag = PASS if ok else FAIL
    print(f"  {tag} {label}" + (f" — {detail}" if detail else ""))
    results.append((label, ok, detail))


def auth_init_script(session: dict) -> str:
    """Seed tokens + Zustand persist before any page script runs."""
    raw = session["user"]
    user = {
        "id": raw["id"],
        "email": raw["email"],
        "full_name": raw["full_name"],
        "role": raw["role"],
    }
    if raw.get("phone"):
        user["phone"] = raw["phone"]
    if raw.get("profile_image_url"):
        user["profile_image_url"] = raw["profile_image_url"]
    persist = {
        "state": {
            "token": session["access"],
            "refreshToken": session["refresh"],
            "user": user,
        },
        "version": 0,
    }
    payload = json.dumps(
        {
            "persist": persist,
            "access": session["access"],
            "refresh": session["refresh"],
            "user": user,
        }
    )
    return f"""
(() => {{
  const data = {payload};
  localStorage.setItem("farumasi-partner-auth", JSON.stringify(data.persist));
  localStorage.setItem("farumasi_partner_token", data.access);
  localStorage.setItem("farumasi_partner_refresh", data.refresh);
  localStorage.setItem("farumasi_partner_user", JSON.stringify(data.user));
}})();
"""


async def login_api(client: httpx.AsyncClient) -> dict:
    r = await client.post(f"{API}/auth/login", json={"email": PARTNER_EMAIL, "password": PARTNER_PW})
    r.raise_for_status()
    data = r.json()
    me = await client.get(
        f"{API}/users/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    me.raise_for_status()
    return {
        "access": data["access_token"],
        "refresh": data.get("refresh_token", data["access_token"]),
        "user": me.json(),
    }


async def api_suite(client: httpx.AsyncClient, h: dict) -> None:
    print("\n--- API (partner) ---")

    r = await client.get(f"{API}/partners/me", headers=h)
    body = r.json()
    ok_me = r.status_code == 200 and body.get("name")
    new_profile = all(k in body for k in ("logo_url", "is_open", "commission_rate_percent"))
    detail_me = f"HTTP {r.status_code}" + (" profile_fields=ok" if new_profile else " (restart API for new profile columns)")
    record("GET /partners/me", ok_me, detail_me)

    for path, name in [
        ("/partners/me/listings?limit=5", "listings"),
        ("/partners/me/orders?limit=5", "orders"),
        ("/partners/me/revenue/summary", "revenue summary"),
        ("/partners/me/revenue", "revenue records"),
        ("/partners/me/withdrawals", "withdrawals"),
        ("/product-requests/?limit=5", "product requests"),
        ("/notifications/unread-count", "notifications"),
    ]:
        r = await client.get(f"{API}{path}", headers=h)
        ok = r.status_code == 200
        extra = ""
        if name == "revenue records" and ok and r.json():
            row = r.json()[0]
            extra = f"rows={len(r.json())} order_code={row.get('order_code')}"
        record(name, ok, f"HTTP {r.status_code} {extra}".strip())

    r = await client.get(f"{API}/partners/me/orders", headers=h, params={"limit": 1})
    if r.status_code == 200 and r.json().get("items"):
        oid = r.json()["items"][0]["id"]
        ro = await client.get(f"{API}/orders/{oid}", headers=h)
        ok = ro.status_code == 200
        items = ro.json().get("items") or []
        has_img_field = bool(items) and (
            items[0].get("product_image_url") is not None
            or items[0].get("product_name")
        )
        record("GET /orders/{id} detail", ok and has_img_field, f"HTTP {ro.status_code} items={len(items)}")


async def http_routes() -> None:
    print("\n--- HTTP routes (MVP) ---")
    active = [
        "/login",
        "/dashboard",
        "/products/catalogue",
        "/products/listed",
        "/orders",
        "/revenue",
        "/requests",
        "/settings",
        "/support",
    ]
    removed = [
        "/inventory",
        "/analytics",
        "/customers",
        "/notifications",
        "/compliance",
        "/team",
        "/activity",
    ]
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as fe:
        for path in active:
            r = await fe.get(f"{PORTAL}{path}")
            record(f"active {path}", r.status_code < 500, f"HTTP {r.status_code}")
        for path in removed:
            r = await fe.get(f"{PORTAL}{path}")
            record(f"removed {path} is 404", r.status_code == 404, f"HTTP {r.status_code}")


async def playwright_ui(session: dict) -> None:
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        record("Playwright installed", False, "pip install playwright && playwright install chromium")
        return

    print("\n--- UI navigation (Playwright) ---")

    nav_targets = [
        ("/dashboard", ("Dashboard", "Welcome back")),
        ("/products/catalogue", ("Catalogue", "Approved")),
        ("/products/listed", ("My Listings", "listings")),
        ("/orders", ("Orders",)),
        ("/revenue", ("Revenue", "Wallet", "Earnings")),
        ("/requests", ("Product Request", "Request")),
        ("/settings", ("Business Profile",)),
        ("/support", ("Help", "Support")),
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        await context.add_init_script(auth_init_script(session))
        page = await context.new_page()

        await page.goto(f"{PORTAL}/dashboard", wait_until="domcontentloaded", timeout=90_000)
        try:
            await page.locator('nav a[href="/dashboard"]').first.wait_for(state="visible", timeout=45_000)
        except Exception:
            pass
        await page.wait_for_timeout(2500)

        on_portal = "/login" not in page.url and await page.locator("nav").count() > 0
        record("authenticated portal shell", on_portal, page.url[:70])

        for href, hints in nav_targets:
            link = page.locator(f'nav a[href="{href}"]').first
            if await link.count() == 0:
                record(f"nav {href}", False, "sidebar link missing")
                continue
            await link.click(timeout=15_000)
            try:
                await page.wait_for_url(f"**{href}**", timeout=20_000)
            except Exception:
                await page.wait_for_timeout(1500)
            url_ok = href in page.url
            try:
                await page.locator("main h1").first.wait_for(state="visible", timeout=25_000)
            except Exception:
                pass
            try:
                body = await page.locator("main").inner_text(timeout=15_000)
            except Exception:
                body = ""
            content_ok = any(h.lower() in body.lower() for h in hints) or len(body) > 100
            record(f"nav {href}", url_ok and content_ok, page.url[:55])

        await page.goto(f"{PORTAL}/dashboard", wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(1500)
        header_text = await page.locator("header").inner_text(timeout=10_000)
        record("topbar shows balance", "RWF" in header_text, "wallet strip")

        await page.goto(f"{PORTAL}/orders", wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(2000)
        detail_link = page.locator('main a[href^="/orders/"]').first
        if await detail_link.count() > 0:
            await detail_link.click(timeout=10_000)
            await page.wait_for_timeout(2000)
            body = await page.locator("main").inner_text()
            ok = "/orders/" in page.url and (
                "Order Items" in body or "Payment" in body or "order" in body.lower()
            )
            record("order detail page", ok, page.url[:50])
        else:
            record("order detail page", True, "skipped — no orders in list")

        await page.goto(f"{PORTAL}/dashboard", wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(800)
        nav_text = await page.locator("nav").inner_text()
        for bad in ("Inventory", "Analytics", "Customers", "Compliance", "Activity Logs", "Team"):
            record(f"sidebar lacks {bad}", bad not in nav_text, "ok" if bad not in nav_text else "still visible")

        has_cat = await page.locator('nav a[href="/products/catalogue"]').count() > 0
        has_listed = await page.locator('nav a[href="/products/listed"]').count() > 0
        record("products submenu links", has_cat and has_listed, "catalogue + listed")

        # UI login smoke (fresh context, no seeded auth)
        login_ctx = await browser.new_context(viewport={"width": 1280, "height": 800})
        login_page = await login_ctx.new_page()
        try:
            await login_page.goto(f"{PORTAL}/login", wait_until="networkidle", timeout=90_000)
            await login_page.locator('input[type="email"]').first.fill(PARTNER_EMAIL)
            await login_page.locator('input[type="password"]').first.fill(PARTNER_PW)
            await login_page.get_by_role("button", name=re.compile(r"Sign\s*In", re.I)).click()
            await login_page.locator('nav a[href="/dashboard"]').first.wait_for(
                state="visible", timeout=90_000
            )
            record("UI login form to dashboard", "/login" not in login_page.url, login_page.url[:55])
        except Exception as exc:
            record("UI login form to dashboard", False, str(exc)[:80])
        await login_ctx.close()

        await browser.close()


async def main() -> int:
    print("\n=== Partner Portal E2E Stress Test ===\n")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(f"{API}/openapi.json")
            if r.status_code != 200:
                print("API not running on :8000")
                return 1
            session = await login_api(client)
            h = {"Authorization": f"Bearer {session['access']}"}
            await api_suite(client, h)
    except Exception as exc:
        record("API suite", False, str(exc)[:120])
        return 1

    try:
        await http_routes()
    except httpx.ConnectError as exc:
        record("HTTP routes", False, f"portal down: {exc}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            session = await login_api(client)
        await playwright_ui(session)
    except httpx.ConnectError:
        record("Playwright prep", False, "API down")
    except Exception as exc:
        record("Playwright suite", False, str(exc)[:120])

    failed = sum(1 for _, ok, _ in results if not ok)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n=== {passed} passed, {failed} failed ===\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
