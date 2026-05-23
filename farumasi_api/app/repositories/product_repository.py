from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import ProductCatalogueItem, ProductListing, ProductRequest
from app.repositories.base import BaseRepository
from app.core.constants import ProductApprovalStatus, ListingAvailability


class ProductRepository(BaseRepository[ProductCatalogueItem]):
    model = ProductCatalogueItem

    async def get_approved(self) -> List[ProductCatalogueItem]:
        result = await self.db.execute(
            select(ProductCatalogueItem).where(
                ProductCatalogueItem.approval_status == ProductApprovalStatus.APPROVED
            )
        )
        return list(result.scalars().all())

    async def search_by_name(self, name: str) -> List[ProductCatalogueItem]:
        result = await self.db.execute(
            select(ProductCatalogueItem).where(
                ProductCatalogueItem.name.ilike(f"%{name}%")
            )
        )
        return list(result.scalars().all())


class ListingRepository(BaseRepository[ProductListing]):
    model = ProductListing

    async def get_by_pharmacy(self, pharmacy_id: str) -> List[ProductListing]:
        result = await self.db.execute(
            select(ProductListing)
            .where(ProductListing.pharmacy_id == pharmacy_id)
            .options(selectinload(ProductListing.product))
        )
        return list(result.scalars().all())

    async def get_available_for_product(
        self, product_id: str
    ) -> List[ProductListing]:
        result = await self.db.execute(
            select(ProductListing)
            .where(
                and_(
                    ProductListing.product_id == product_id,
                    ProductListing.availability_status == ListingAvailability.AVAILABLE,
                )
            )
            .options(selectinload(ProductListing.pharmacy), selectinload(ProductListing.product))
        )
        return list(result.scalars().all())


class ProductRequestRepository(BaseRepository[ProductRequest]):
    model = ProductRequest


# Alias used by product_service
ProductListingRepository = ListingRepository
