"""Direct DDL script to add insurance columns to digital_prescriptions.

Run from farumasi_api directory:
    python scripts/add_insurance_columns.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for col, defn in [
            ("insurance_provider", "VARCHAR(200)"),
            ("insurance_discount_pct", "FLOAT"),
        ]:
            try:
                await db.execute(
                    text(
                        f"ALTER TABLE digital_prescriptions "
                        f"ADD COLUMN IF NOT EXISTS {col} {defn}"
                    )
                )
                print(f"  [ok] {col}")
            except Exception as exc:
                print(f"  [skip] {col}: {exc}")
        await db.commit()
        result = await db.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='digital_prescriptions' "
                "AND column_name IN ('insurance_provider','insurance_discount_pct')"
            )
        )
        found = [r[0] for r in result.fetchall()]
        print("Confirmed columns:", found)


if __name__ == "__main__":
    asyncio.run(main())
