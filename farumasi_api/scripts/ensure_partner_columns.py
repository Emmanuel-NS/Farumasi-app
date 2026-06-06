"""Add partner company profile columns expected by the ORM.

Run: cd farumasi_api && python scripts/ensure_partner_columns.py
"""
from __future__ import annotations

import asyncio

from sqlalchemy import text

from app.core.database import AsyncSessionLocal

COLUMNS = [
    ("logo_url", "VARCHAR(500)"),
    ("description", "TEXT"),
    ("commission_rate_percent", "NUMERIC(5, 2)"),
    ("is_open", "BOOLEAN NOT NULL DEFAULT TRUE"),
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for name, ddl in COLUMNS:
            exists = await db.execute(
                text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = 'partner_companies' AND column_name = :name"
                ),
                {"name": name},
            )
            if exists.scalar_one_or_none():
                print(f"  skip {name} (exists)")
                continue
            await db.execute(text(f"ALTER TABLE partner_companies ADD COLUMN {name} {ddl}"))
            print(f"  added {name}")
        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
