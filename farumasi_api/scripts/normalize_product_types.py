"""One-shot migration: normalize legacy product_type values to canonical 4.

Run with:
    python -m scripts.normalize_product_types
"""
from __future__ import annotations

import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import ProductCatalogueItem as Product


LEGACY_MAP = {
    "supplement":    "food_supplements",
    "supplements":   "food_supplements",
    "device":        "medical_device",
    "devices":       "medical_device",
    "personal_care": "cosmetics",
    "cosmetic":      "cosmetics",
    "drug":          "medicine",
    "otc":           "medicine",
    "prescription":  "medicine",
}

CANONICAL = {"medicine", "medical_device", "food_supplements", "cosmetics"}


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Product))
        products = list(result.scalars().all())
        print(f"Scanning {len(products)} products...")
        updated = 0
        for p in products:
            raw = (p.product_type or "").strip().lower()
            if raw in CANONICAL:
                continue
            new_val = LEGACY_MAP.get(raw, "medicine")
            print(f"  {p.id}  '{p.product_type}' -> '{new_val}'  ({p.name})")
            p.product_type = new_val
            updated += 1
        if updated:
            await db.commit()
            print(f"Updated {updated} products.")
        else:
            print("No products needed updating.")


if __name__ == "__main__":
    asyncio.run(main())
