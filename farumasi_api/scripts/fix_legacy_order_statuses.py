"""One-off: normalize legacy order_status values in the database."""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.constants import LEGACY_ORDER_STATUS_MAP
from app.models.order import Order


async def main():
    fixed = 0
    async with AsyncSessionLocal() as db:
        for legacy, canonical in LEGACY_ORDER_STATUS_MAP.items():
            rows = (await db.execute(select(Order).where(Order.order_status == legacy))).scalars().all()
            for order in rows:
                order.order_status = canonical
                fixed += 1
        await db.commit()
    print(f"Normalized {fixed} order(s)")


asyncio.run(main())
