"""One-off: normalize legacy revenue status and backfill missing wallet records."""
import asyncio

from sqlalchemy import select, text

from app.core.constants import OrderStatus
from app.core.database import AsyncSessionLocal
from app.models.order import Order
from app.models.revenue import RevenueRecord
from app.services.order_service import OrderService
from app.services.revenue_service import RevenueService


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("UPDATE revenue_records SET status = 'available' WHERE status = 'settled'")
        )
        await db.commit()
        print(f"Updated {result.rowcount} revenue row(s) from settled -> available")

        orders = list(
            (
                await db.execute(
                    select(Order).where(
                        Order.order_status.in_(
                            [OrderStatus.COMPLETED, OrderStatus.DELIVERED]
                        )
                    )
                )
            ).scalars().all()
        )
        existing = set(
            (
                await db.execute(select(RevenueRecord.order_id))
            ).scalars().all()
        )
        created = 0
        order_svc = OrderService(db)
        for order in orders:
            if order.id not in existing:
                await order_svc._create_revenue(order)
                created += 1
        if created:
            await db.commit()
        print(f"Backfilled {created} revenue record(s) for completed/delivered orders")

        summary = await RevenueService(db).get_summary_for_owner(
            "1d7d65c8-f78a-4cfa-8423-4221c397d6dc"
        )
        print(
            "Kigali demo wallet:",
            f"available={summary.available_balance}",
            f"net={summary.total_net}",
        )


if __name__ == "__main__":
    asyncio.run(main())
