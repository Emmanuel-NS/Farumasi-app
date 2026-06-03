"""Idempotently add order_items.sell_mode if missing."""
import asyncio

from sqlalchemy import text

from app.core.database import engine


async def main() -> None:
    async with engine.begin() as conn:
        r = await conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'order_items' AND column_name = 'sell_mode'"
            )
        )
        if r.fetchone() is None:
            await conn.execute(
                text(
                    "ALTER TABLE order_items "
                    "ADD COLUMN sell_mode VARCHAR(20) NOT NULL DEFAULT 'pack'"
                )
            )
            print("Added order_items.sell_mode")
        else:
            print("order_items.sell_mode already exists")


if __name__ == "__main__":
    asyncio.run(main())
