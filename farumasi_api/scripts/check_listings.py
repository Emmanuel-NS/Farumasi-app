import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT pl.id, pl.product_id, pl.unit_price, pl.created_at, p.name "
            "FROM product_listings pl "
            "JOIN product_catalogue_items p ON pl.product_id = p.id "
            "WHERE p.name LIKE 'ST%' OR p.name LIKE 'Debug%' "
            "ORDER BY pl.created_at DESC "
            "LIMIT 10"
        ))
        rows = r.fetchall()
        print("Recent test listings:")
        for row in rows:
            print(f"  id={str(row[0])[:8]}... product={row[4]} unit_price={row[2]} created_at={row[3]}")


asyncio.run(main())
