import asyncio
import sys
sys.path.insert(0, r"C:\Users\PC\Farumasi-app\farumasi_api")
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT u.email, u.first_name, u.last_name, u.role, ph.name as pharmacy FROM users u LEFT JOIN pharmacy_staff ps ON ps.user_id = u.id LEFT JOIN pharmacies ph ON ph.id = ps.pharmacy_id WHERE LOWER(u.first_name) LIKE :name OR LOWER(u.last_name) LIKE :name2"), {"name": "%grace%", "name2": "%uwiman%"})
        rows = r.fetchall()
        print(f"Found {len(rows)} users:")
        for row in rows:
            print(row)
        
        # Also list all pharmacist/pharmacy_admin users
        r2 = await db.execute(text("SELECT u.email, u.first_name, u.last_name, u.role, ph.name as pharmacy FROM users u LEFT JOIN pharmacy_staff ps ON ps.user_id = u.id LEFT JOIN pharmacies ph ON ph.id = ps.pharmacy_id WHERE u.role IN ('pharmacist', 'pharmacy_admin')"))
        rows2 = r2.fetchall()
        print(f"\nAll pharmacist/pharmacy_admin accounts ({len(rows2)}):")
        for row in rows2:
            print(row)

asyncio.run(main())
