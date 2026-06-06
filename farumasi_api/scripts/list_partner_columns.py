import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main() -> None:
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='partner_companies' ORDER BY 1"
            )
        )
        print([row[0] for row in r.fetchall()])


if __name__ == "__main__":
    asyncio.run(main())
