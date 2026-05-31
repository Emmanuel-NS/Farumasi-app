import asyncio, sys
sys.path.insert(0, '.')

async def check():
    from app.core.database import AsyncSessionLocal
    from sqlalchemy import text
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT email, role, status FROM users ORDER BY created_at"))
        rows = r.fetchall()
        print("All users:")
        for row in rows:
            print(f"  {row[0]} | {row[1]} | {row[2]}")

asyncio.run(check())
