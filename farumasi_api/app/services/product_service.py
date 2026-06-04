"""Phase-3 ProductService — aligned with real SQLAlchemy models."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import (
    EntityStatus,
    ListingAvailability,
    ProductApprovalStatus,
    ProductRequestStatus,
    UserRole,
)
from app.core.exceptions import (
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    ValidationError,
)
from app.models.insurance import InsuranceProvider
from app.models.partner import PartnerCompany
from app.models.pharmacist import PharmacistProfile
from app.models.pharmacy import Pharmacy
from app.models.product import ProductCatalogueItem, ProductListing, ProductRequest, ProductCategory
from app.models.user import User
from app.schemas.product import (
    ListingPartnerBrief,
    ListingPharmacyBrief,
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCreate,
    ProductListingCreate,
    ProductListingOut,
    ProductListingUpdate,
    ProductRequestCreate,
    ProductRequestReview,
    ProductRequestUpdate,
    ProductUpdate,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.utils.packaging import validate_listing_prices, validate_product_packaging_fields


# ─── role helpers ─────────────────────────────────────────────────────────

_PRODUCT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.PHARMACIST}
_REQUEST_REVIEWERS = {UserRole.SUPER_ADMIN, UserRole.PHARMACIST}
_REQUEST_CREATORS = {UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST, UserRole.PARTNER_COMPANY_ADMIN}


def listing_to_out(listing: ProductListing) -> ProductListingOut:
    """Build API listing response with nested pharmacy / partner summaries."""
    out = ProductListingOut.model_validate(listing)
    if listing.pharmacy:
        ph = listing.pharmacy
        out.pharmacy = ListingPharmacyBrief(
            id=ph.id,
            name=ph.name,
            district=ph.district,
            image_url=getattr(ph, "image_url", None),
            is_open=bool(getattr(ph, "is_open", True)),
            accepts_delivery=bool(getattr(ph, "accepts_delivery", True)),
        )
    if listing.partner_company and listing.partner_company.status == EntityStatus.ACTIVE:
        co = listing.partner_company
        out.partner_company = ListingPartnerBrief(
            id=co.id,
            name=co.name,
            company_type=co.company_type,
            district=co.district,
            logo_url=co.logo_url,
            description=co.description,
            is_open=bool(co.is_open),
        )
    return out


def _ensure_role(actor: User, allowed: set[str], action: str) -> None:
    if actor.role not in allowed:
        raise AuthorizationError(f"Role '{actor.role}' cannot {action}")


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ════════════════════════════════════════════════════════════════════
    # Catalogue
    # ════════════════════════════════════════════════════════════════════

    async def create_product(self, data: ProductCreate, actor: User) -> ProductCatalogueItem:
        _ensure_role(actor, _PRODUCT_MANAGERS, "create products")
        validate_product_packaging_fields(
            packaging_class=data.packaging_class,
            units_per_pack=data.units_per_pack,
            min_partial_quantity=data.min_partial_quantity,
            partial_unit_name=data.partial_unit_name,
        )
        # Super admin auto-approves, pharmacist puts it under review
        approval = (
            ProductApprovalStatus.APPROVED
            if actor.role == UserRole.SUPER_ADMIN
            else ProductApprovalStatus.PENDING_REVIEW
        )
        product = ProductCatalogueItem(
            name=data.name,
            generic_name=data.generic_name,
            category=data.category,
            product_type=data.product_type,
            description=data.description,
            dosage_form=data.dosage_form,
            strength=data.strength,
            manufacturer=data.manufacturer,
            brand=data.brand,
            country_of_origin=data.country_of_origin,
            prescription_required=data.prescription_required,
            regulatory_status=data.regulatory_status,
            image_url=data.image_url,
            packaging_class=data.packaging_class,
            units_per_pack=data.units_per_pack,
            min_partial_quantity=data.min_partial_quantity,
            partial_unit_name=data.partial_unit_name,
            approval_status=approval,
            created_by_user_id=actor.id,
        )
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def update_product(
        self, product_id: str, data: ProductUpdate, actor: User
    ) -> ProductCatalogueItem:
        _ensure_role(actor, _PRODUCT_MANAGERS, "update products")
        product = await self._get_product_or_404(product_id)
        patch = data.model_dump(exclude_unset=True)
        merged = {
            "packaging_class": patch.get("packaging_class", product.packaging_class),
            "units_per_pack": patch.get("units_per_pack", product.units_per_pack),
            "min_partial_quantity": patch.get("min_partial_quantity", product.min_partial_quantity),
            "partial_unit_name": patch.get("partial_unit_name", product.partial_unit_name),
        }
        validate_product_packaging_fields(**merged)
        for field, value in patch.items():
            setattr(product, field, value)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def set_product_status(
        self, product_id: str, new_status: ProductApprovalStatus, actor: User
    ) -> ProductCatalogueItem:
        # Only super_admin can suspend/reject; pharmacist can move to approved/pending
        if actor.role == UserRole.SUPER_ADMIN:
            pass
        elif actor.role == UserRole.PHARMACIST:
            if new_status == ProductApprovalStatus.SUSPENDED:
                raise AuthorizationError("Only super_admin can suspend a product")
        else:
            raise AuthorizationError("Only super_admin or pharmacist can change product status")
        product = await self._get_product_or_404(product_id)
        product.approval_status = new_status
        if new_status == ProductApprovalStatus.APPROVED:
            pharmacist_id = await self._pharmacist_id_for_user(actor.id)
            if pharmacist_id:
                product.approved_by_pharmacist_id = pharmacist_id
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def get_product(self, product_id: str) -> ProductCatalogueItem:
        """Return a single product with listing stats attached (same fields as list view)."""
        item = await self._get_product_or_404(product_id)
        # Attach listing stats via a separate aggregation query (avoids UUID subquery join issues)
        _active_statuses = [ListingAvailability.AVAILABLE, ListingAvailability.LOW_STOCK]
        from sqlalchemy import text
        raw = (
            await self.db.execute(
                text(
                    "SELECT MIN(price), MAX(price), COUNT(id), MIN(unit_price) "
                    "FROM product_listings "
                    "WHERE product_id = :pid "
                    "  AND availability_status IN ('available','low_stock') "
                    "  AND status = 'active'"
                ),
                {"pid": product_id},
            )
        ).one_or_none()
        if raw and raw[2]:
            item.price_from = float(raw[0]) if raw[0] is not None else None  # type: ignore[attr-defined]
            item.price_to = float(raw[1]) if raw[1] is not None else None    # type: ignore[attr-defined]
            item.listing_count = int(raw[2])                                  # type: ignore[attr-defined]
            item.unit_price_from = float(raw[3]) if raw[3] is not None else None  # type: ignore[attr-defined]
        else:
            item.price_from = None     # type: ignore[attr-defined]
            item.price_to = None       # type: ignore[attr-defined]
            item.listing_count = 0     # type: ignore[attr-defined]
            item.unit_price_from = None  # type: ignore[attr-defined]
        return item

    async def list_products(
        self,
        actor: Optional[User],
        offset: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        category: Optional[str] = None,
        include_unapproved: bool = False,
        only_with_listings: bool = True,
    ) -> Tuple[List[ProductCatalogueItem], int]:
        # ── Active listing stats subquery ──────────────────────────────────
        _active_statuses = [ListingAvailability.AVAILABLE, ListingAvailability.LOW_STOCK]
        listing_stats = (
            select(
                ProductListing.product_id.label("product_id"),
                func.min(ProductListing.price).label("price_from"),
                func.max(ProductListing.price).label("price_to"),
                func.count(ProductListing.id).label("listing_count"),
                func.min(ProductListing.unit_price).label("unit_price_from"),
            )
            .where(
                and_(
                    ProductListing.availability_status.in_(_active_statuses),
                    ProductListing.status == EntityStatus.ACTIVE,
                )
            )
            .group_by(ProductListing.product_id)
            .subquery()
        )

        q = (
            select(
                ProductCatalogueItem,
                listing_stats.c.price_from,
                listing_stats.c.price_to,
                listing_stats.c.listing_count,
                listing_stats.c.unit_price_from,
            )
            .outerjoin(listing_stats, ProductCatalogueItem.id == listing_stats.c.product_id)
        )

        # Only product managers can see unapproved entries
        is_manager = actor is not None and actor.role in _PRODUCT_MANAGERS
        if not (include_unapproved and is_manager):
            q = q.where(
                ProductCatalogueItem.approval_status == ProductApprovalStatus.APPROVED
            )
        if only_with_listings:
            q = q.where(listing_stats.c.listing_count > 0)
        if search:
            like = f"%{search}%"
            q = q.where(
                or_(
                    ProductCatalogueItem.name.ilike(like),
                    ProductCatalogueItem.generic_name.ilike(like),
                    ProductCatalogueItem.description.ilike(like),
                )
            )
        if category and category.lower() != "all":
            q = q.where(ProductCatalogueItem.category == category)

        total = (
            await self.db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        rows = (await self.db.execute(
            q.order_by(ProductCatalogueItem.created_at.desc()).offset(offset).limit(limit)
        )).all()

        # Attach price_from / listing_count onto the ORM objects for serialisation
        products: List[ProductCatalogueItem] = []
        for row in rows:
            item: ProductCatalogueItem = row[0]
            item.price_from = row[1]  # type: ignore[attr-defined]
            item.price_to = row[2]  # type: ignore[attr-defined]
            item.listing_count = int(row[3]) if row[3] is not None else 0  # type: ignore[attr-defined]
            item.unit_price_from = row[4]  # type: ignore[attr-defined]
            products.append(item)
        return products, total

    async def list_categories(self) -> list[ProductCategory]:
        """Return all categories ordered by display_order then name."""
        rows = await self.db.execute(
            select(ProductCategory).order_by(ProductCategory.display_order, ProductCategory.name)
        )
        return list(rows.scalars().all())

    async def create_category(self, data: ProductCategoryCreate) -> ProductCategory:
        existing = await self.db.execute(
            select(ProductCategory).where(ProductCategory.name == data.name)
        )
        if existing.scalar_one_or_none():
            raise ValidationError(f"Category '{data.name}' already exists")
        cat = ProductCategory(
            id=str(__import__('uuid').uuid4()),
            name=data.name,
            icon_name=data.icon_name,
            display_order=data.display_order,
            is_default=False,
        )
        self.db.add(cat)
        await self.db.commit()
        await self.db.refresh(cat)
        return cat

    async def update_category(self, category_id: str, data: ProductCategoryUpdate) -> ProductCategory:
        row = await self.db.execute(
            select(ProductCategory).where(ProductCategory.id == category_id)
        )
        cat = row.scalar_one_or_none()
        if not cat:
            raise NotFoundError("Category not found")
        if data.name is not None:
            # Check uniqueness only if name is changing
            if data.name != cat.name:
                dup = await self.db.execute(
                    select(ProductCategory).where(ProductCategory.name == data.name)
                )
                if dup.scalar_one_or_none():
                    raise ValidationError(f"Category '{data.name}' already exists")
            cat.name = data.name
        if data.icon_name is not None:
            cat.icon_name = data.icon_name
        if data.display_order is not None:
            cat.display_order = data.display_order
        await self.db.commit()
        await self.db.refresh(cat)
        return cat

    async def delete_category(self, category_id: str) -> None:
        row = await self.db.execute(
            select(ProductCategory).where(ProductCategory.id == category_id)
        )
        cat = row.scalar_one_or_none()
        if not cat:
            raise NotFoundError("Category not found")
        await self.db.delete(cat)
        await self.db.commit()

    async def upsert_categories(self, items: list[dict]) -> list[ProductCategory]:
        """Bulk upsert categories from pharmacist portal localStorage sync.
        Each item: {name, icon_name, display_order}.
        """
        result = []
        for item in items:
            row = await self.db.execute(
                select(ProductCategory).where(ProductCategory.name == item["name"])
            )
            cat = row.scalar_one_or_none()
            if cat:
                cat.icon_name = item.get("icon_name", cat.icon_name)
                cat.display_order = item.get("display_order", cat.display_order)
            else:
                cat = ProductCategory(
                    id=str(__import__('uuid').uuid4()),
                    name=item["name"],
                    icon_name=item.get("icon_name", "general"),
                    display_order=item.get("display_order", 0),
                    is_default=False,
                )
                self.db.add(cat)
            result.append(cat)
        await self.db.commit()
        for cat in result:
            await self.db.refresh(cat)
        return result

    # ════════════════════════════════════════════════════════════════════
    # Listings
    # ════════════════════════════════════════════════════════════════════

    async def create_listing(
        self, data: ProductListingCreate, actor: User
    ) -> ProductListing:
        # 1. xor constraint
        if bool(data.pharmacy_id) == bool(data.partner_company_id):
            raise ValidationError(
                "Listing must belong to exactly one of pharmacy_id or partner_company_id"
            )
        # 2. validate ownership
        await self._assert_listing_owner_for_create(actor, data.pharmacy_id, data.partner_company_id)
        # 3. validate approved product
        product = await self._get_product_or_404(data.product_id)
        if product.approval_status != ProductApprovalStatus.APPROVED:
            raise BusinessRuleError("Cannot list an unapproved product")
        validate_listing_prices(product, data.price, data.unit_price)
        # 3b. prevent duplicate listing by same entity
        dup_q = select(ProductListing).where(ProductListing.product_id == data.product_id)
        if data.pharmacy_id:
            dup_q = dup_q.where(ProductListing.pharmacy_id == data.pharmacy_id)
        else:
            dup_q = dup_q.where(ProductListing.partner_company_id == data.partner_company_id)
        existing = (await self.db.execute(dup_q)).scalars().first()
        if existing:
            raise BusinessRuleError("This product is already listed by your organisation. Edit the existing listing instead.")
        # 4. expired-cannot-be-available
        availability = self._normalize_availability(
            data.availability_status, data.expiry_date, data.stock_quantity
        )
        # 5. validate insurance IDs exist
        await self._validate_insurance_ids(data.accepted_insurance_ids)

        listing = ProductListing(
            product_id=data.product_id,
            pharmacy_id=data.pharmacy_id,
            partner_company_id=data.partner_company_id,
            price=data.price,
            unit_price=data.unit_price,
            stock_quantity=data.stock_quantity,
            availability_status=availability,
            expiry_date=data.expiry_date,
            batch_number=data.batch_number,
            accepted_insurance_ids=data.accepted_insurance_ids,
            delivery_options=data.delivery_options,
            fulfillment_time_minutes=data.fulfillment_time_minutes,
            location_latitude=data.location_latitude,
            location_longitude=data.location_longitude,
            status=EntityStatus.ACTIVE,
        )
        self.db.add(listing)
        await self.db.commit()
        return await self._get_listing_or_404(listing.id)

    async def update_listing(
        self, listing_id: str, data: ProductListingUpdate, actor: User
    ) -> ProductListing:
        listing = await self._get_listing_or_404(listing_id)
        await self._assert_listing_owner(actor, listing)
        product = await self._get_product_or_404(listing.product_id)

        patch = data.model_dump(exclude_unset=True)
        new_price = patch.get("price", listing.price)
        new_unit_price = patch.get("unit_price", listing.unit_price)
        validate_listing_prices(product, float(new_price), float(new_unit_price) if new_unit_price is not None else None)

        for field, value in patch.items():
            setattr(listing, field, value)

        await self._validate_insurance_ids(listing.accepted_insurance_ids)
        listing.availability_status = self._normalize_availability(
            ListingAvailability(listing.availability_status),
            listing.expiry_date,
            listing.stock_quantity,
        )
        await self.db.commit()
        return await self._get_listing_or_404(listing.id)

    async def set_listing_availability(
        self, listing_id: str, new_status: ListingAvailability, actor: User
    ) -> ProductListing:
        listing = await self._get_listing_or_404(listing_id)
        # super_admin and pharmacist (platform moderators) can suspend any listing;
        # pharmacy owners can change other statuses on their own listings.
        is_moderator = actor.role in (UserRole.SUPER_ADMIN, UserRole.PHARMACIST)
        if new_status == ListingAvailability.SUSPENDED:
            if not is_moderator:
                raise AuthorizationError("Only platform moderators can suspend a listing")
        else:
            if not is_moderator:
                await self._assert_listing_owner(actor, listing)

        listing.availability_status = self._normalize_availability(
            new_status, listing.expiry_date, listing.stock_quantity
        )
        await self.db.commit()
        return await self._get_listing_or_404(listing.id)

    async def delete_listing(self, listing_id: str, actor: User) -> None:
        listing = await self._get_listing_or_404(listing_id)
        is_moderator = actor.role in (UserRole.SUPER_ADMIN, UserRole.PHARMACIST)
        if not is_moderator:
            await self._assert_listing_owner(actor, listing)
        await self.db.delete(listing)
        await self.db.commit()

    async def get_listing(self, listing_id: str) -> ProductListing:
        return await self._get_listing_or_404(listing_id)

    async def list_listings(
        self,
        offset: int = 0,
        limit: int = 20,
        pharmacy_id: Optional[str] = None,
        partner_company_id: Optional[str] = None,
        product_id: Optional[str] = None,
        availability_status: Optional[str] = None,
    ) -> Tuple[List[ProductListing], int]:
        filters = []
        if pharmacy_id:
            filters.append(ProductListing.pharmacy_id == pharmacy_id)
        if partner_company_id:
            filters.append(ProductListing.partner_company_id == partner_company_id)
        if product_id:
            filters.append(ProductListing.product_id == product_id)
        if availability_status:
            filters.append(ProductListing.availability_status == availability_status)

        count_q = select(func.count()).select_from(ProductListing)
        if filters:
            count_q = count_q.where(*filters)
        total = (await self.db.execute(count_q)).scalar_one()

        data_q = (
            select(ProductListing)
            .options(
                selectinload(ProductListing.product),
                selectinload(ProductListing.pharmacy),
                selectinload(ProductListing.partner_company),
            )
            .order_by(ProductListing.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if filters:
            data_q = data_q.where(*filters)

        result = await self.db.execute(data_q)
        return list(result.scalars().all()), total

    # ════════════════════════════════════════════════════════════════════
    # Product Requests
    # ════════════════════════════════════════════════════════════════════

    async def create_request(
        self, data: ProductRequestCreate, actor: User
    ) -> ProductRequest:
        _ensure_role(actor, _REQUEST_CREATORS, "create product requests")
        pharmacy_id: Optional[str] = None
        partner_company_id: Optional[str] = None
        requester_type: str
        if actor.role in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
            pharmacy = await self._find_owned_pharmacy(actor.id)
            if not pharmacy:
                raise BusinessRuleError(
                    "You must be linked to a pharmacy before creating a product request"
                )
            pharmacy_id = pharmacy.id
            requester_type = "pharmacy"
        else:
            company = await self._find_owned_partner(actor.id)
            if not company:
                raise BusinessRuleError(
                    "You must own a partner company before creating a product request"
                )
            partner_company_id = company.id
            requester_type = "partner"

        req = ProductRequest(
            requester_user_id=actor.id,
            requester_type=requester_type,
            pharmacy_id=pharmacy_id,
            partner_company_id=partner_company_id,
            product_name=data.product_name,
            category=data.category,
            product_type=data.product_type,
            manufacturer=data.manufacturer,
            brand=data.brand,
            description=data.description,
            intended_use=data.intended_use,
            proposed_price=data.proposed_price,
            documents_urls=data.documents_urls,
            status=ProductRequestStatus.DRAFT,
        )
        self.db.add(req)
        await self.db.commit()
        await self.db.refresh(req)
        return req

    async def update_request(
        self, request_id: str, data: ProductRequestUpdate, actor: User
    ) -> ProductRequest:
        req = await self._get_request_or_404(request_id)
        if req.requester_user_id != actor.id:
            raise AuthorizationError("You can only edit your own request")
        if req.status not in (
            ProductRequestStatus.DRAFT,
            ProductRequestStatus.MORE_INFO_REQUIRED,
        ):
            raise BusinessRuleError(
                "Only draft or more_info_required requests can be edited"
            )
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(req, field, value)
        await self.db.commit()
        await self.db.refresh(req)
        return req

    async def submit_request(self, request_id: str, actor: User) -> ProductRequest:
        req = await self._get_request_or_404(request_id)
        if req.requester_user_id != actor.id:
            raise AuthorizationError("You can only submit your own request")
        if req.status not in (
            ProductRequestStatus.DRAFT,
            ProductRequestStatus.MORE_INFO_REQUIRED,
        ):
            raise BusinessRuleError(
                f"Cannot submit a request in status '{req.status}'"
            )
        req.status = ProductRequestStatus.SUBMITTED
        await self.db.commit()
        await self.db.refresh(req)

        # Notify reviewers (super_admins as a placeholder routing group)
        try:
            notif = NotificationService(self.db)
            msg = f"New product request: {req.product_name}."
            for role in (UserRole.SUPER_ADMIN, UserRole.PHARMACIST):
                await notif.broadcast_to_role(
                    role,
                    title="Product Request Submitted",
                    message=msg,
                    category="product_request",
                    action_url=f"/product-requests/{req.id}",
                )
            await self.db.commit()
        except Exception:
            pass
        return req

    async def review_request(
        self, request_id: str, data: ProductRequestReview, actor: User
    ) -> ProductRequest:
        _ensure_role(actor, _REQUEST_REVIEWERS, "review product requests")
        req = await self._get_request_or_404(request_id)
        # Requester cannot review own request
        if req.requester_user_id == actor.id:
            raise AuthorizationError("You cannot review your own request")
        if req.status not in (
            ProductRequestStatus.SUBMITTED,
            ProductRequestStatus.UNDER_REVIEW,
            ProductRequestStatus.MORE_INFO_REQUIRED,
        ):
            raise BusinessRuleError(
                f"Cannot review request in status '{req.status}'"
            )

        req.status = data.status
        req.review_notes = data.review_notes
        req.reviewed_at = datetime.now(timezone.utc)
        pharmacist_id = await self._pharmacist_id_for_user(actor.id)
        if pharmacist_id:
            req.reviewed_by_pharmacist_id = pharmacist_id

        # If approved → create or link catalogue product
        if data.status == ProductRequestStatus.APPROVED:
            await self._fulfill_approved_request(req, data.link_to_product_id, actor)

        await self.db.commit()
        await self.db.refresh(req)

        # Audit + notify the requester
        try:
            await AuditService(self.db).log(
                actor_user_id=actor.id,
                action="product_request.reviewed",
                entity_type="ProductRequest",
                entity_id=req.id,
                new_value={"status": str(data.status), "notes": data.review_notes},
            )
            await NotificationService(self.db).product_request_reviewed(
                req.requester_user_id, req.id, str(data.status)
            )
            await self.db.commit()
        except Exception:
            pass
        return req

    async def get_request(self, request_id: str, actor: User) -> ProductRequest:
        req = await self._get_request_or_404(request_id)
        # Requester or reviewer can read
        if req.requester_user_id == actor.id:
            return req
        if actor.role in _REQUEST_REVIEWERS:
            return req
        raise AuthorizationError("You cannot view this request")

    async def list_requests(
        self,
        actor: User,
        offset: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[ProductRequest], int]:
        q = select(ProductRequest)
        # Reviewers see everything; requesters only see their own
        if actor.role not in _REQUEST_REVIEWERS:
            q = q.where(ProductRequest.requester_user_id == actor.id)
        if status:
            q = q.where(ProductRequest.status == status)
        total = (
            await self.db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        result = await self.db.execute(
            q.order_by(ProductRequest.created_at.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    # ════════════════════════════════════════════════════════════════════
    # Internal helpers
    # ════════════════════════════════════════════════════════════════════

    async def _get_product_or_404(self, product_id: str) -> ProductCatalogueItem:
        result = await self.db.execute(
            select(ProductCatalogueItem).where(ProductCatalogueItem.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            raise NotFoundError("Product", product_id)
        return product

    async def _get_listing_or_404(self, listing_id: str) -> ProductListing:
        result = await self.db.execute(
            select(ProductListing)
            .options(
                selectinload(ProductListing.product),
                selectinload(ProductListing.pharmacy),
                selectinload(ProductListing.partner_company),
            )
            .where(ProductListing.id == listing_id)
        )
        listing = result.scalar_one_or_none()
        if not listing:
            raise NotFoundError("Listing", listing_id)
        return listing

    async def _get_request_or_404(self, request_id: str) -> ProductRequest:
        result = await self.db.execute(
            select(ProductRequest).where(ProductRequest.id == request_id)
        )
        req = result.scalar_one_or_none()
        if not req:
            raise NotFoundError("Product request", request_id)
        return req

    async def _find_owned_pharmacy(self, user_id: str) -> Optional[Pharmacy]:
        result = await self.db.execute(
            select(Pharmacy).where(Pharmacy.owner_user_id == user_id)
        )
        pharmacy = result.scalars().first()
        if pharmacy:
            return pharmacy
        # Fall back: pharmacist staff assigned to a pharmacy
        res = await self.db.execute(
            select(PharmacistProfile.pharmacy_id).where(
                PharmacistProfile.user_id == user_id
            )
        )
        pid = res.scalar_one_or_none()
        if not pid:
            return None
        res = await self.db.execute(select(Pharmacy).where(Pharmacy.id == pid))
        return res.scalar_one_or_none()

    async def _find_owned_partner(self, user_id: str) -> Optional[PartnerCompany]:
        from app.models.user import User as UserModel

        result = await self.db.execute(select(UserModel).where(UserModel.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return None
        from app.services.partner_access import resolve_user_partner

        return await resolve_user_partner(self.db, user)

    async def _pharmacist_id_for_user(self, user_id: str) -> Optional[str]:
        result = await self.db.execute(
            select(PharmacistProfile.id).where(PharmacistProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def _assert_listing_owner_for_create(
        self, actor: User, pharmacy_id: Optional[str], partner_company_id: Optional[str]
    ) -> None:
        if actor.role == UserRole.SUPER_ADMIN:
            return
        if pharmacy_id:
            if actor.role not in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
                raise AuthorizationError("Only pharmacy staff can list under a pharmacy")
            pharmacy = await self._find_owned_pharmacy(actor.id)
            if not pharmacy or pharmacy.id != pharmacy_id:
                raise AuthorizationError("You do not own this pharmacy")
        elif partner_company_id:
            if actor.role != UserRole.PARTNER_COMPANY_ADMIN:
                raise AuthorizationError(
                    "Only partner portal users can list under a partner company"
                )
            from app.services.partner_access import user_owns_partner

            if not await user_owns_partner(self.db, actor, partner_company_id):
                raise AuthorizationError("You do not have access to this partner company")

    async def _assert_listing_owner(self, actor: User, listing: ProductListing) -> None:
        """Ensure actor may modify this listing (partner vs pharmacy, not both)."""
        if actor.role == UserRole.SUPER_ADMIN:
            return
        # Partner-owned listings take precedence (some rows may still have pharmacy_id set).
        if listing.partner_company_id:
            if actor.role != UserRole.PARTNER_COMPANY_ADMIN:
                raise AuthorizationError(
                    "Only partner portal users can modify partner company listings"
                )
            from app.services.partner_access import user_owns_partner

            if not await user_owns_partner(self.db, actor, listing.partner_company_id):
                raise AuthorizationError("You do not have access to this partner listing")
            return
        if listing.pharmacy_id:
            if actor.role not in (UserRole.PHARMACY_ADMIN, UserRole.PHARMACIST):
                raise AuthorizationError("Only pharmacy staff can modify pharmacy listings")
            from app.services.pharmacy_access import user_owns_pharmacy

            if not await user_owns_pharmacy(self.db, actor, listing.pharmacy_id):
                raise AuthorizationError("You do not have access to this pharmacy listing")
            return
        raise BusinessRuleError("Listing has no owner reference")

    async def _validate_insurance_ids(self, ids: Optional[Sequence[str]]) -> None:
        if not ids:
            return
        result = await self.db.execute(
            select(InsuranceProvider.id).where(InsuranceProvider.id.in_(list(ids)))
        )
        found = {row[0] for row in result.all()}
        missing = [i for i in ids if i not in found]
        if missing:
            raise ValidationError(
                f"Unknown insurance provider IDs: {', '.join(missing)}"
            )

    def _normalize_availability(
        self,
        requested_status: ListingAvailability,
        expiry_date: Optional[datetime],
        stock_quantity: Optional[int],
        requested: bool = False,
    ) -> ListingAvailability:
        """Enforce: expired → unavailable (or raise on explicit available);
        zero stock → out_of_stock; otherwise honor requested_status."""
        # Normalize expiry_date for comparison
        if expiry_date is not None:
            exp = expiry_date
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                if requested_status == ListingAvailability.AVAILABLE:
                    raise BusinessRuleError("Expired product cannot be marked available")
                return ListingAvailability.UNAVAILABLE
        if stock_quantity is not None and stock_quantity == 0:
            if requested_status == ListingAvailability.SUSPENDED:
                return ListingAvailability.SUSPENDED
            return ListingAvailability.OUT_OF_STOCK
        return requested_status

    async def _fulfill_approved_request(
        self,
        req: ProductRequest,
        link_to_product_id: Optional[str],
        actor: User,
    ) -> None:
        if link_to_product_id:
            product = await self._get_product_or_404(link_to_product_id)
            if product.approval_status != ProductApprovalStatus.APPROVED:
                raise BusinessRuleError(
                    "Linked product must already be approved"
                )
            return  # link only; no new catalogue item
        # Otherwise create a new approved catalogue item from the request
        pharmacist_id = await self._pharmacist_id_for_user(actor.id)
        product = ProductCatalogueItem(
            name=req.product_name,
            category=req.category,
            product_type=req.product_type,
            manufacturer=req.manufacturer,
            brand=req.brand,
            description=req.description,
            approval_status=ProductApprovalStatus.APPROVED,
            approved_by_pharmacist_id=pharmacist_id,
            created_by_user_id=req.requester_user_id,
        )
        self.db.add(product)
        await self.db.flush()
