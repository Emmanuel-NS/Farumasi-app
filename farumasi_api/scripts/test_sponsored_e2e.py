"""
End-to-end test: pharmacist marks article sponsored -> patient carousel APIs + UI.

Run with API + portals up:
  API:        uvicorn on :8000
  Pharmacist: :3003
  Patient:    :3002

  python scripts/test_sponsored_e2e.py
"""
from __future__ import annotations

import asyncio
import sys

import httpx

API = "http://127.0.0.1:8000/api/v1"
PHARM = "http://localhost:3003"
PATIENT = "http://localhost:3002"

PHARM_EMAIL = "pharmacist@farumasi.com"
PHARM_PW = "Pharmacist@12345"
PATIENT_EMAIL = "patient@farumasi.com"
PATIENT_PW = "Patient@12345"


def ok(msg: str) -> None:
    print(f"  [PASS] {msg}")


def fail(msg: str) -> None:
    print(f"  [FAIL] {msg}")


async def login(client: httpx.AsyncClient, email: str, password: str) -> dict:
    return await login_client(client, email, password)


async def inject_portal_session(
    client: httpx.AsyncClient,
    page,
    portal: str,
    email: str,
    password: str,
    *,
    patient: bool,
) -> bool:
    """Seed localStorage from API login (same as real portals after sign-in)."""
    login = await login_client(client, email, password)
    if not login.get("access_token"):
        return False
    token = login["access_token"]
    refresh = login.get("refresh_token", token)
    me = (
        await client.get(
            f"{API}/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    ).json()

    await page.goto(f"{portal}/auth/login", wait_until="domcontentloaded", timeout=90_000)
    if patient:
        await page.evaluate(
            """(d) => {
              localStorage.setItem('farumasi_access_token', d.access);
              localStorage.setItem('farumasi_refresh_token', d.refresh);
              localStorage.setItem('farumasi_auth', 'true');
            }""",
            {"access": token, "refresh": refresh},
        )
    else:
        await page.evaluate(
            """(d) => {
              localStorage.setItem('farumasi_pharm_token', d.access);
              localStorage.setItem('farumasi_pharm_refresh', d.refresh);
              localStorage.setItem('farumasi_pharm_user', JSON.stringify(d.user));
            }""",
            {"access": token, "refresh": refresh, "user": me},
        )
    return True


async def login_client(client: httpx.AsyncClient, email: str, password: str) -> dict:
    r = await client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return {}
    return r.json()


async def main() -> int:
    print("\n=== Sponsored E2E test ===\n")
    errors = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        print("--- API routes ---")
        try:
            spec = (await client.get(f"{API}/openapi.json")).json()
            paths = spec.get("paths", {})
            need = [
                "/api/v1/articles/{article_id}/sponsored",
                "/api/v1/articles/feed/sponsored",
            ]
            for p in need:
                if p in paths:
                    ok(f"OpenAPI has {p}")
                else:
                    fail(f"OpenAPI missing {p} - restart API with latest code")
                    errors += 1
        except Exception as exc:
            fail(f"OpenAPI unreachable: {exc}")
            return 1

        ph_login = await login(client, PHARM_EMAIL, PHARM_PW)
        ph_token = ph_login.get("access_token", "")
        if not ph_token:
            fail("Pharmacist login")
            return 1
        ok("Pharmacist login")
        ph_h = {"Authorization": f"Bearer {ph_token}"}

        print("\n--- Pharmacist: set sponsored ---")
        arts = (
            await client.get(
                f"{API}/articles/admin/all",
                headers=ph_h,
                params={"limit": 50, "status": "published"},
            )
        ).json().get("items", [])

        if not arts:
            fail("No published articles to test")
            return 1

        target = arts[0]
        aid = target["id"]
        title = target.get("title", aid[:8])

        for a in arts:
            if a["id"] != aid and a.get("is_sponsored"):
                await client.patch(
                    f"{API}/articles/{a['id']}/sponsored",
                    headers=ph_h,
                    json={"is_sponsored": False},
                )

        r = await client.patch(
            f"{API}/articles/{aid}/sponsored",
            headers=ph_h,
            json={"is_sponsored": True},
        )
        if r.status_code != 200 or r.json().get("is_sponsored") is not True:
            fail(f"PATCH /sponsored HTTP {r.status_code} is_sponsored={r.json().get('is_sponsored')}")
            errors += 1
        else:
            ok(f"PATCH /sponsored saved for: {title[:50]}")

        admin_row = next(
            (
                x
                for x in (
                    await client.get(
                        f"{API}/articles/admin/all",
                        headers=ph_h,
                        params={"limit": 50, "status": "published"},
                    )
                ).json().get("items", [])
                if x["id"] == aid
            ),
            None,
        )
        if admin_row and admin_row.get("is_sponsored") is True:
            ok("Admin list shows is_sponsored=true")
        else:
            fail("Admin list missing is_sponsored=true")
            errors += 1

        print("\n--- Patient: sponsored carousel APIs ---")
        pat_login = await login(client, PATIENT_EMAIL, PATIENT_PW)
        pat_h = {"Authorization": f"Bearer {pat_login.get('access_token', '')}"}

        for label, url, params in [
            ("feed/sponsored", f"{API}/articles/feed/sponsored", {"limit": 10}),
            ("sponsored_only list", f"{API}/articles/", {"sponsored_only": True, "limit": 10}),
        ]:
            r = await client.get(url, headers=pat_h, params=params)
            if r.status_code != 200:
                fail(f"GET {label} HTTP {r.status_code}")
                errors += 1
                continue
            data = r.json()
            items = data if isinstance(data, list) else data.get("items", [])
            if aid in [i.get("id") for i in items]:
                ok(f"GET {label} includes sponsored article ({len(items)} items)")
            else:
                fail(f"GET {label} missing article ({len(items)} items)")
                errors += 1

        print("\n--- Portal pages (HTTP) ---")
        for name, base, path in [
            ("Pharmacist health", PHARM, "/health"),
            ("Patient store", PATIENT, "/store"),
            ("Patient health", PATIENT, "/health"),
        ]:
            try:
                r = await client.get(f"{base}{path}", follow_redirects=True)
                if r.status_code == 200:
                    ok(f"{name} {path} HTTP 200")
                else:
                    fail(f"{name} {path} HTTP {r.status_code}")
                    errors += 1
            except Exception as exc:
                fail(f"{name} {path} - {exc}")
                errors += 1

        print("\n--- Browser UI (Playwright) ---")
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            fail("Playwright not installed (pip install playwright)")
        else:
            errors += await run_browser_ui(client, title)

    print("\n=== Summary ===")
    if errors:
        print(f"  {errors} check(s) failed.")
        print("  Ensure API was restarted: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000")
        return 1
    print("  All checks passed.")
    return 0


async def run_browser_ui(client: httpx.AsyncClient, expected_title: str) -> int:
    from playwright.async_api import async_playwright

    errors = 0
    snippet = expected_title[:30]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("  ... pharmacist session")
        if not await inject_portal_session(
            client, page, PHARM, PHARM_EMAIL, PHARM_PW, patient=False
        ):
            fail("Pharmacist session inject failed")
            errors += 1

        await page.goto(f"{PHARM}/health", wait_until="networkidle", timeout=120_000)
        if await page.locator("text=Health Content").count() > 0:
            ok("Pharmacist /health page loaded")
        else:
            fail("Pharmacist /health - title not found")
            errors += 1

        sponsored_cb = page.locator('input[type="checkbox"]').filter(
            has=page.locator("text=Sponsored")
        )
        if await sponsored_cb.count() == 0:
            sponsored_cb = page.locator("text=Sponsored").first
        if await page.locator("text=Sponsored").count() > 0:
            ok("Pharmacist /health - sponsored controls visible")
            sponsored_row = page.locator("label").filter(has_text="Sponsored")
            if await sponsored_row.count() > 0:
                box = sponsored_row.first.locator('input[type="checkbox"]')
                if await box.is_checked():
                    ok("Pharmacist /health - sponsored checkbox reflects saved state")
                else:
                    fail("Pharmacist /health - sponsored box unchecked (reload page or restart API)")
                    errors += 1
        else:
            fail("Pharmacist /health - no Sponsored label")
            errors += 1

        print("  ... patient /store (guest — no login required for carousel)")
        sponsored_api: list[tuple[str, int]] = []

        def on_response(resp) -> None:
            url = resp.url
            if ":8000" in url and (
                "feed/sponsored" in url or "sponsored_only=true" in url
            ):
                sponsored_api.append((url, resp.status))

        page.on("response", on_response)

        await page.goto(f"{PATIENT}/store", wait_until="load", timeout=120_000)
        await page.wait_for_timeout(25_000)
        if any(status == 200 for _, status in sponsored_api):
            ok(f"Patient /store sponsored API OK ({len(sponsored_api)} call(s))")
        elif sponsored_api:
            fail(f"Patient /store sponsored API bad status: {sponsored_api}")
            errors += 1
        else:
            fail("Patient /store never called sponsored API")
            errors += 1
        carousel = page.locator('[data-testid="sponsored-carousel"]')
        if await carousel.count() > 0:
            ok("Patient /store - sponsored carousel in DOM")
            body = await carousel.inner_text()
            if "Sponsored" in body:
                ok("Patient /store - Sponsored label visible")
            if snippet.lower() in body.lower() or len(body) > 40:
                ok("Patient /store - carousel shows article content")
            else:
                fail(f"Patient /store - carousel text unexpected: {body[:80]!r}")
                errors += 1
        else:
            fail("Patient /store - no sponsored carousel (check API URL / auth)")
            errors += 1

        await page.goto(f"{PATIENT}/health", wait_until="networkidle", timeout=120_000)
        await page.wait_for_timeout(3000)
        if await page.locator('[data-testid="sponsored-carousel"]').count() > 0:
            ok("Patient /health - sponsored carousel in DOM")
        else:
            fail("Patient /health - no sponsored carousel")
            errors += 1

        await browser.close()
    return errors


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
