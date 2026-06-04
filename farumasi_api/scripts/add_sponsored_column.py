"""Add health_articles.is_sponsored if missing (run once from farumasi_api/)."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main():
    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                "ALTER TABLE health_articles "
                "ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false"
            )
        )
        await db.commit()
    print("Added health_articles.is_sponsored (if missing)")


asyncio.run(main())
