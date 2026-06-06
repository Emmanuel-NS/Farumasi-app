import asyncio
import httpx

API = "http://127.0.0.1:8000/api/v1"


async def main() -> None:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{API}/auth/login", json={"email": "admin@farumasi.com", "password": "Admin@12345"})
        tok = r.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        resp = await c.get(f"{API}/orders/?limit=1", headers=h)
        o = resp.json()["items"][0]
        print("pharmacy nested:", o.get("pharmacy"))
        print("partner nested:", o.get("partner_company"))
        ph = await c.get(f"{API}/pharmacies/?limit=1", headers=h)
        print("pharmacies:", ph.status_code, ph.json().get("total"))
        pt = await c.get(f"{API}/partners/?limit=1", headers=h)
        print("partners:", pt.status_code, pt.json().get("total") if pt.status_code == 200 else pt.text[:120])


if __name__ == "__main__":
    asyncio.run(main())
