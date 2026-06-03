"""Live navigation & API smoke test for FARUMASI portals."""
from __future__ import annotations

import asyncio
import sys
import time
from typing import Callable, Awaitable

import httpx

API = "http://127.0.0.1:8000/api/v1"
PORTALS = {
    "patient": "http://127.0.0.1:3002",
    "pharmacist": "http://127.0.0.1:3003",
}

PHARM_EMAIL = "pharmacist@farumasi.com"
PHARM_PW = "Pharmacist@12345"
PATIENT_EMAIL = "patient@farumasi.com"
PATIENT_PW = "Patient@12345"

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
        ok, detail = False, str(exc)[:120]
    ms = int((time.perf_counter() - t0) * 1000)
    suffix = f"{detail} ({ms}ms)" if detail else f"{ms}ms"
    return record(label, ok, suffix)


async def login(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{API}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        return ""
    return r.json().get("access_token", "")


async def main() -> int:
    print("\n=== FARUMASI live navigation test ===\n")

    # ── API workflows (fast path — what blocks page navigation) ──
    async with httpx.AsyncClient(timeout=30.0) as client:
        async def api_openapi():
            r = await client.get(f"{API}/openapi.json")
            return r.status_code == 200, f"HTTP {r.status_code}"

        if not await timed("API health", api_openapi):
            print("\nAPI is not healthy. Start: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000")
            return 1

        print("\n--- Pharmacist API workflow ---")
        ph_token = await login(client, PHARM_EMAIL, PHARM_PW)
        if not record("Pharmacist login", bool(ph_token)):
            return 1
        h = {"Authorization": f"Bearer {ph_token}"}

        async def list_rx():
            r = await client.get(f"{API}/prescriptions/", headers=h, params={"limit": 10})
            if r.status_code != 200:
                return False, f"HTTP {r.status_code}"
            return True, f"{len(r.json().get('items', []))} prescriptions"

        await timed("List prescriptions", list_rx)

        rx_id = None
        r = await client.get(f"{API}/prescriptions/", headers=h, params={"limit": 5})
        items = r.json().get("items", []) if r.status_code == 200 else []
        if items:
            rx_id = items[0]["id"]

        if rx_id:
            async def get_rx():
                r2 = await client.get(f"{API}/prescriptions/{rx_id}", headers=h)
                if r2.status_code != 200:
                    return False, f"HTTP {r2.status_code}"
                body = r2.json()
                return True, (
                    f"status={body.get('status')} items={len(body.get('items', []))} "
                    f"insurance={body.get('insurance_provider') or 'none'}"
                )

            await timed("Get prescription detail", get_rx)

            async def patch_insurance():
                r2 = await client.patch(
                    f"{API}/prescriptions/{rx_id}",
                    headers=h,
                    json={"insurance_provider": "RSSB (test)", "insurance_discount_pct": 15.0},
                )
                if r2.status_code != 200:
                    return False, f"HTTP {r2.status_code}"
                b = r2.json()
                ok = b.get("insurance_provider") == "RSSB (test)" and b.get("insurance_discount_pct") == 15.0
                return ok, "insurance fields saved"

            await timed("Patch prescription insurance", patch_insurance)

        async def search_products():
            r2 = await client.get(f"{API}/products/", headers=h, params={"search": "para", "limit": 5})
            if r2.status_code != 200:
                return False, f"HTTP {r2.status_code}"
            return True, f"{len(r2.json().get('items', []))} products"

        await timed("Search products (pharmacist)", search_products)

        print("\n--- Patient API workflow ---")
        pt_token = await login(client, PATIENT_EMAIL, PATIENT_PW)
        if not record("Patient login", bool(pt_token)):
            return 1
        ph2 = {"Authorization": f"Bearer {pt_token}"}

        async def my_rx():
            r2 = await client.get(f"{API}/patients/me/prescriptions", headers=ph2)
            if r2.status_code != 200:
                return False, f"HTTP {r2.status_code}"
            data = r2.json()
            count = len(data) if isinstance(data, list) else len(data.get("items", []))
            return True, f"{count} prescriptions"

        await timed("Patient my prescriptions", my_rx)

        async def list_products():
            r2 = await client.get(f"{API}/products/", headers=ph2, params={"limit": 5})
            if r2.status_code != 200:
                return False, f"HTTP {r2.status_code}"
            return True, f"{len(r2.json().get('items', []))} products"

        await timed("List products (patient)", list_products)

    # ── Frontend page loads (separate client — long timeout for first compile) ──
    print("\n--- Frontend page loads (Next.js) ---")
    pages = [
        ("patient /store", f"{PORTALS['patient']}/store"),
        ("patient /cart", f"{PORTALS['patient']}/cart"),
        ("patient /prescriptions", f"{PORTALS['patient']}/prescriptions"),
        ("patient /orders", f"{PORTALS['patient']}/orders"),
        ("pharmacist /requests", f"{PORTALS['pharmacist']}/requests"),
        ("pharmacist /orders", f"{PORTALS['pharmacist']}/orders"),
    ]

    async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as fe:
        for name, url in pages:
            async def load_page(u=url):
                try:
                    r = await fe.get(u)
                    return r.status_code < 500, f"HTTP {r.status_code}"
                except httpx.ConnectError:
                    return False, "portal not running"
                except httpx.ReadTimeout:
                    return False, "timeout (>90s)"

            await timed(f"Page {name}", load_page)

    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"\n=== Summary: {passed} passed, {failed} failed ===\n")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
