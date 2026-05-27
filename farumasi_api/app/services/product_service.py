"""Phase-3 ProductService — aligned with real SQLAlchemy models."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import and_, or_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.models.product import ProductCatalogueItem, ProductListing, ProductRequest
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductListingCreate,
    ProductListingUpdate,
    ProductRequestCreate,
    ProductRequestReview,
    ProductRequestUpdate,
    ProductUpdate,
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


# ─── role helpers ─────────────────────────────────────────────────────────

_PRODUCT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.PHARMACIST}
_REQUEST_REVIEWERS = {UserRole.SUPER_ADMIN, UserRole.PHARMACIST}
_REQUEST_CREATORS = {UserRole.PHARMACY_ADMIN, UserRole.PARTNER_COMPANY_ADMIN}


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
        for field, value in data.model_dump(exclude_unset=True).items():
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
        return await self._get_product_or_404(product_id)

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
                func.count(ProductListing.id).label("listing_count"),
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
                listing_stats.c.listing_count,
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
            item.listing_count = int(row[2]) if row[2] is not None else 0  # type: ignore[attr-defined]
            products.append(item)
        return products, total

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
        await self.db.refresh(listing)
        return listing

    async def update_listing(
        self, listing_id: str, data: ProductListingUpdate, actor: User
    ) -> ProductListing:
        listing = await self._get_listing_or_404(listing_id)
        await self._assert_listing_owner(actor, listing)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(listing, field, value)

        await self._validate_insurance_ids(listing.accepted_insurance_ids)
        listing.availability_status = self._normalize_availability(
            ListingAvailability(listing.availability_status),
            listing.expiry_date,
            listing.stock_quantity,
        )
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def set_listing_availability(
        self, listing_id: str, new_status: ListingAvailability, actor: User
    ) -> ProductListing:
        listing = await self._get_listing_or_404(listing_id)
        # super_admin can suspend; owner can change other statuses
        if new_status == ListingAvailability.SUSPENDED:
            if actor.role != UserRole.SUPER_ADMIN:
                raise AuthorizationError("Only super_admin can suspend a listing")
        else:
            await self._assert_listing_owner(actor, listing)

        listing.availability_status = self._normalize_availability(
            new_status, listing.expiry_date, listing.stock_quantity
        )
        await self.db.commit()
        await self.db.refresh(listing)
        return listing

    async def delete_listing(self, listing_id: str, actor: User) -> None:
        listing = await self._get_listing_or_404(listing_id)
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
        q = select(ProductListing)
        if pharmacy_id:
            q = q.where(ProductListing.pharmacy_id == pharmacy_id)
        if partner_company_id:
            q = q.where(ProductListing.partner_company_id == partner_company_id)
        if product_id:
            q = q.where(ProductListing.product_id == product_id)
        if availability_status:
            q = q.where(ProductListing.availability_status == availability_status)
        total = (
            await self.db.execute(select(func.count()).select_from(q.subquery()))
        ).scalar_one()
        result = await self.db.execute(
            q.order_by(ProductListing.created_at.desc()).offset(offset).limit(limit)
        )
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
        if actor.role == UserRole.PHARMACY_ADMIN:
            pharmacy = await self._find_owned_pharmacy(actor.id)
            if not pharmacy:
                raise BusinessRuleError(
                    "You must own a pharmacy before creating a product request"
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
            await NotificationService(self.db).broadcast_to_role(
                UserRole.SUPER_ADMIN,
                title="Product Request Submitted",
                message=f"A new product request has been submitted: {req.product_name}.",
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
            select(ProductListing).where(ProductListing.id == listing_id)
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
        return result.scalars().first()

    async def _find_owned_partner(self, user_id: str) -> Optional[PartnerCompany]:
        result = await self.db.execute(
            select(PartnerCompany).where(PartnerCompany.owner_user_id == user_id)
        )
        return result.scalars().first()

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
            if actor.role != UserRole.PHARMACY_ADMIN:
                raise AuthorizationError("Only pharmacy_admin can list under a pharmacy")
            pharmacy = await self._find_owned_pharmacy(actor.id)
            if not pharmacy or pharmacy.id != pharmacy_id:
                raise AuthorizationError("You do not own this pharmacy")
        elif partner_company_id:
            if actor.role != UserRole.PARTNER_COMPANY_ADMIN:
                raise AuthorizationError(
                    "Only partner_company_admin can list under a partner company"
                )
            company = await self._find_owned_partner(actor.id)
            if not company or company.id != partner_company_id:
                raise AuthorizationError("You do not own this partner company")

    async def _assert_listing_owner(self, actor: User, listing: ProductListing) -> None:
        if actor.role == UserRole.SUPER_ADMIN:
            return
        if listing.pharmacy_id:
            if actor.role != UserRole.PHARMACY_ADMIN:
                raise AuthorizationError("Only pharmacy_admin can modify pharmacy listings")
            pharmacy = await self._find_owned_pharmacy(actor.id)
            if not pharmacy or pharmacy.id != listing.pharmacy_id:
                raise AuthorizationError("You do not own this listing's pharmacy")
        elif listing.partner_company_id:
            if actor.role != UserRole.PARTNER_COMPANY_ADMIN:
                raise AuthorizationError(
                    "Only partner_company_admin can modify partner listings"
                )
            company = await self._find_owned_partner(actor.id)
            if not company or company.id != listing.partner_company_id:
                raise AuthorizationError("You do not own this listing's partner company")
        else:
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
