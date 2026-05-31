"""Test all critical API endpoints for MVP audit."""
import asyncio
import aiohttp
import json

BASE = "http://localhost:8000/api/v1"

CREDS = {
    "admin": {"email": "admin@farumasi.com", "password": "Admin@12345"},
    "patient": {"email": "patient@farumasi.com", "password": "Patient@12345"},
    "pharmacist": {"email": "pharmacist@farumasi.com", "password": "Pharmacy@12345"},
    "partner": {"email": "pharmacy_admin@farumasi.com", "password": "Pharmacy@12345"},
}

TESTS = {
    "admin": [
        "/users/?limit=5",
        "/pharmacies/?limit=5",
        "/orders/?limit=5",
        "/prescriptions/?limit=5",
        "/product-requests/?limit=5",
        "/revenue/",
        "/analytics/admin",
        "/withdrawals/",
        "/listings/?limit=5",
        "/products/?limit=5",
        "/pharmacists/?limit=5",
        "/audit/?limit=5",
    ],
    "patient": [
        "/patients/me",
        "/orders/my?limit=5",
        "/patients/me/prescriptions",
        "/notifications/?limit=5",
        "/listings/?limit=10",
        "/products/?limit=10",
        "/products/categories/",
    ],
    "pharmacist": [
        "/pharmacists/me",
        "/orders/?limit=5",
        "/prescriptions/?limit=5",
        "/notifications/?limit=5",
        "/product-requests/?limit=5",
        "/products/?limit=5",
        "/pharmacists/prescription-reviews",
    ],
    "partner": [
        "/partners/me",
        "/partners/me/listings?limit=5",
        "/orders/?limit=5",
        "/notifications/?limit=5",
        "/products/?limit=5",
        "/partners/me/revenue",
    ],
}


async def login(session, role):
    async with session.post(f"{BASE}/auth/login", json=CREDS[role]) as r:
        if r.status == 200:
            data = await r.json()
            return data["access_token"]
        return None


async def test(session, token, ep):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        async with session.get(f"{BASE}{ep}", headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as r:
            body = await r.json()
            if r.status == 200:
                if isinstance(body, list):
                    return f"✅ {r.status} {ep} (list={len(body)})"
                elif isinstance(body, dict):
                    total = body.get("total", "ok")
                    items = body.get("items", body.get("data", []))
                    return f"✅ {r.status} {ep} (total={total}, items={len(items) if isinstance(items, list) else '-'})"
                else:
                    return f"✅ {r.status} {ep}"
            else:
                detail = (body.get("detail", str(body)) if isinstance(body, dict) else str(body))[:80]
                return f"❌ {r.status} {ep} → {detail}"
    except Exception as e:
        return f"💥 ERR {ep} → {str(e)[:60]}"


async def main():
    async with aiohttp.ClientSession() as session:
        for role, endpoints in TESTS.items():
            print(f"\n{'='*60}")
            print(f"ROLE: {role.upper()}")
            print(f"{'='*60}")
            token = await login(session, role)
            if not token:
                print(f"  ❌ LOGIN FAILED")
                continue
            print(f"  ✅ Login OK")
            for ep in endpoints:
                result = await test(session, token, ep)
                print(f"  {result}")


asyncio.run(main())
