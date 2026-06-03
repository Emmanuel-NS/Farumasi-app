import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = 'product_listings' ORDER BY column_name"
            )
        )
        print("=== product_listings columns ===")
        for row in r.fetchall():
            print(f"  {row[0]}: {row[1]}")

        r2 = await db.execute(
            text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = 'order_items' ORDER BY column_name"
            )
        )
        print("\n=== order_items columns ===")
        for row in r2.fetchall():
            print(f"  {row[0]}: {row[1]}")


asyncio.run(main())
