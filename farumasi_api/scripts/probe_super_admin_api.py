"""Probe all Super Admin portal API routes."""
import asyncio
import httpx

API = "http://127.0.0.1:8000/api/v1"

ROUTES = [
    ("GET", "/users/me"),
    ("GET", "/analytics/admin"),
    ("GET", "/analytics/orders/summary"),
    ("GET", "/analytics/prescriptions/summary"),
    ("GET", "/analytics/products/patient-catalog"),
    ("GET", "/admin/audit-logs?limit=5"),
    ("GET", "/admin/audit-logs/meta/entity-types"),
    ("GET", "/orders/?limit=5"),
    ("GET", "/prescriptions/?limit=5"),
    ("GET", "/pharmacies/?limit=5"),
    ("GET", "/partners/?limit=5"),
    ("GET", "/users/?limit=5"),
    ("GET", "/withdrawals/"),
    ("GET", "/revenue/"),
    ("GET", "/revenue/summary"),
    ("GET", "/audit/?limit=5"),
    ("GET", "/admin/profiles/overview"),
]


async def main() -> None:
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as c:
        login = await c.post(f"{API}/auth/login", json={"email": "admin@farumasi.com", "password": "Admin@12345"})
        if login.status_code != 200:
            print("LOGIN FAILED", login.status_code, login.text[:200])
            return
        h = {"Authorization": f"Bearer {login.json()['access_token']}"}
        print("=== Super Admin API probe ===")
        failures = []
        for method, path in ROUTES:
            url = f"{API}{path}"
            r = await c.request(method, url, headers=h)
            ok = r.status_code < 400
            mark = "OK" if ok else "FAIL"
            print(f"{mark} {r.status_code} {method} {path}")
            if not ok:
                failures.append((path, r.status_code, r.text[:150]))

        # Seller finance (dynamic ids)
        ph = await c.get(f"{API}/pharmacies/?limit=1", headers=h)
        if ph.status_code == 200 and ph.json().get("items"):
            pid = ph.json()["items"][0]["id"]
            r = await c.get(f"{API}/admin/sellers/pharmacy/{pid}/finance", headers=h)
            print(f"{'OK' if r.status_code == 200 else 'FAIL'} {r.status_code} GET /admin/sellers/pharmacy/{{id}}/finance")
            if r.status_code >= 400:
                failures.append(("/admin/sellers/pharmacy/...", r.status_code, r.text[:150]))

        pt = await c.get(f"{API}/partners/?limit=1", headers=h)
        if pt.status_code == 200 and pt.json().get("items"):
            cid = pt.json()["items"][0]["id"]
            r = await c.get(f"{API}/admin/sellers/partner/{cid}/finance", headers=h)
            print(f"{'OK' if r.status_code == 200 else 'FAIL'} {r.status_code} GET /admin/sellers/partner/{{id}}/finance")
            if r.status_code >= 400:
                failures.append(("/admin/sellers/partner/...", r.status_code, r.text[:150]))

        if failures:
            print("\n=== Failures ===")
            for path, code, body in failures:
                print(f"{code} {path}: {body}")
        else:
            print("\nAll routes OK")


if __name__ == "__main__":
    asyncio.run(main())
