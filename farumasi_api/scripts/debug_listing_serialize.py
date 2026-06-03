"""Diagnose ResponseValidationError for ProductListingOut."""
import asyncio

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.product import ProductListing
from app.schemas.product import ProductListingOut


async def main():
    async with AsyncSessionLocal() as db:
        # Fetch the latest listing with product eagerly loaded
        result = await db.execute(
            select(ProductListing)
            .options(selectinload(ProductListing.product))
            .order_by(ProductListing.created_at.desc())
            .limit(1)
        )
        listing = result.scalar_one_or_none()
        if not listing:
            print("No listings found")
            return

        print(f"Listing id: {listing.id}")
        print(f"  product: {listing.product}")
        print(f"  product.packaging_class: {listing.product.packaging_class if listing.product else 'N/A'}")
        print(f"  product.allows_partial_selling: {listing.product.allows_partial_selling if listing.product else 'N/A'}")
        print(f"  listing.unit_price: {listing.unit_price}")

        try:
            out = ProductListingOut.model_validate(listing)
            print(f"\nSerialization SUCCESS: {out.model_dump()}")
        except Exception as e:
            print(f"\nSerialization FAILED: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()


asyncio.run(main())
