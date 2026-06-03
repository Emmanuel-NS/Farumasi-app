"""Test create_listing service directly with fresh product."""
import asyncio
import traceback
import uuid

from sqlalchemy import select

from app.core.constants import ProductApprovalStatus
from app.core.database import AsyncSessionLocal
from app.models.product import ProductCatalogueItem
from app.models.user import User
from app.schemas.product import ProductListingCreate
from app.services.product_service import ProductService


async def main():
    async with AsyncSessionLocal() as db:
        # Create a brand new product
        product = ProductCatalogueItem(
            name=f"Debug Ibuprofen 400mg {uuid.uuid4().hex[:6]}",
            category="Analgesics",
            product_type="medicine",
            dosage_form="Tablet",
            prescription_required=False,
            packaging_class="tablets_capsules",
            units_per_pack=30,
            min_partial_quantity=4,
            partial_unit_name="tablet",
            approval_status=ProductApprovalStatus.APPROVED,
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        print(f"Created product: {product.name} (id={product.id})")

        # Get pharmacist3 user
        r2 = await db.execute(
            select(User).where(User.email == "pharmacist3@farumasi.com")
        )
        actor = r2.scalar_one_or_none()
        print(f"Actor: {actor.email} role={actor.role}")

        # Build the listing data
        data = ProductListingCreate(
            product_id=product.id,
            pharmacy_id="5524db64-1317-487d-a09e-dee16a53b8de",
            price=5600,
            unit_price=250.0,
            stock_quantity=200,
            availability_status="available",
        )

        svc = ProductService(db)
        try:
            listing = await svc.create_listing(data, actor)
            print(f"  SUCCESS: listing.id={listing.id} unit_price={listing.unit_price}")
            print(f"  listing.product: {listing.product}")
            # Try pydantic serialization
            from app.schemas.product import ProductListingOut
            out = ProductListingOut.model_validate(listing)
            print(f"  SERIALIZATION OK: unit_price={out.unit_price}")
            print(f"  product.allows_partial_selling={out.product.allows_partial_selling if out.product else 'N/A'}")
        except Exception as e:
            print(f"  FAILED: {type(e).__name__}: {e}")
            traceback.print_exc()


asyncio.run(main())
