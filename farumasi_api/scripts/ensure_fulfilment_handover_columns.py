"""Idempotent schema patch for partner fulfilment handover (migration s3t4u5v6w7x8).

Safe fallback if Alembic did not run on Render. Uses DATABASE_URL from .env or --url.

  python scripts/ensure_fulfilment_handover_columns.py
  python scripts/ensure_fulfilment_handover_columns.py --url "postgresql://..."
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

from sqlalchemy import text


def _apply_url(raw: str) -> None:
    sync = raw.replace("postgres://", "postgresql://", 1)
    os.environ["DATABASE_URL"] = sync
    os.environ["ASYNC_DATABASE_URL"] = sync.replace("postgresql://", "postgresql+asyncpg://", 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", help="Postgres URL (optional; default from .env)")
    args = parser.parse_args()
    if args.url:
        _apply_url(args.url)

    from app.core.database import AsyncSessionLocal

    COLUMNS: list[tuple[str, str, str]] = [
        ("orders", "partner_fulfilled_at", "TIMESTAMP WITH TIME ZONE"),
        ("orders", "physical_prescription_collected_at", "TIMESTAMP WITH TIME ZONE"),
        (
            "digital_prescriptions",
            "requires_physical_collection",
            "BOOLEAN NOT NULL DEFAULT TRUE",
        ),
        ("order_items", "dispatch_dosage", "VARCHAR(100)"),
        ("order_items", "dispatch_notes", "TEXT"),
    ]

    async def column_exists(db, table: str, column: str) -> bool:
        result = await db.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :table AND column_name = :column"
            ),
            {"table": table, "column": column},
        )
        return result.scalar_one_or_none() is not None

    async def main() -> None:
        async with AsyncSessionLocal() as db:
            for table, column, ddl in COLUMNS:
                if await column_exists(db, table, column):
                    print(f"  skip {table}.{column} (exists)")
                    continue
                await db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                print(f"  added {table}.{column}")
            await db.commit()
        print("Fulfilment handover columns OK.")

    asyncio.run(main())
