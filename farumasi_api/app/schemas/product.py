"""Phase-3 product, listing, and request schemas — aligned with real SQLAlchemy models."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import field_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import (
    ProductType,
    ProductApprovalStatus,
    ProductRequestStatus,
    ListingAvailability,
)


# ─── Product Catalogue ────────────────────────────────────────────────────

class ProductCreate(FarumasiBaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    product_type: ProductType = ProductType.MEDICINE
    description: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    information_source_url: Optional[str] = None
    prescription_required: bool = False
    regulatory_status: Optional[str] = None
    image_url: Optional[str] = None
    # Packaging & partial selling
    packaging_class: Optional[str] = None
    units_per_pack: Optional[int] = None
    min_partial_quantity: Optional[int] = None
    partial_unit_name: Optional[str] = None


class ProductUpdate(FarumasiBaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[ProductType] = None
    description: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    information_source_url: Optional[str] = None
    prescription_required: Optional[bool] = None
    regulatory_status: Optional[str] = None
    image_url: Optional[str] = None
    # Packaging & partial selling
    packaging_class: Optional[str] = None
    units_per_pack: Optional[int] = None
    min_partial_quantity: Optional[int] = None
    partial_unit_name: Optional[str] = None


class ProductStatusUpdate(FarumasiBaseModel):
    approval_status: ProductApprovalStatus


class ProductOut(FarumasiBaseModel):
    id: str
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    product_type: str
    description: Optional[str] = None
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    country_of_origin: Optional[str] = None
    information_source_url: Optional[str] = None
    prescription_required: bool
    regulatory_status: Optional[str] = None
    approval_status: str
    image_url: Optional[str] = None
    created_at: datetime
    # Populated when queried with listing stats
    price_from: Optional[float] = None
    price_to: Optional[float] = None
    listing_count: Optional[int] = None
    # Packaging & partial selling
    packaging_class: Optional[str] = None
    allows_partial_selling: bool = False
    units_per_pack: Optional[int] = None
    min_partial_quantity: Optional[int] = None
    partial_unit_name: Optional[str] = None
    # Lowest unit price (partial) across active listings
    unit_price_from: Optional[float] = None


# ─── Product Listing ──────────────────────────────────────────────────────

class ProductListingCreate(FarumasiBaseModel):
    product_id: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    price: float
    unit_price: Optional[float] = None
    stock_quantity: int = 0
    availability_status: ListingAvailability = ListingAvailability.AVAILABLE
    expiry_date: Optional[datetime] = None
    batch_number: Optional[str] = None
    accepted_insurance_ids: Optional[List[str]] = None
    delivery_options: Optional[List[str]] = None
    fulfillment_time_minutes: int = 60
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None

    @field_validator("price")
    @classmethod
    def _price_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def _stock_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock cannot be negative")
        return v

    @field_validator("fulfillment_time_minutes")
    @classmethod
    def _fulfillment_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Fulfillment time cannot be negative")
        return v


class ProductListingUpdate(FarumasiBaseModel):
    price: Optional[float] = None
    unit_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    availability_status: Optional[ListingAvailability] = None
    expiry_date: Optional[datetime] = None
    batch_number: Optional[str] = None
    accepted_insurance_ids: Optional[List[str]] = None
    delivery_options: Optional[List[str]] = None
    fulfillment_time_minutes: Optional[int] = None
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None

    @field_validator("price")
    @classmethod
    def _price_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @field_validator("stock_quantity")
    @classmethod
    def _stock_non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Stock cannot be negative")
        return v


class ListingAvailabilityUpdate(FarumasiBaseModel):
    availability_status: ListingAvailability


class ListingPharmacyBrief(FarumasiBaseModel):
    """Patient-safe pharmacy summary on a listing."""

    id: str
    name: str
    district: Optional[str] = None
    image_url: Optional[str] = None
    is_open: bool = True
    accepts_delivery: bool = True


class ListingPartnerBrief(FarumasiBaseModel):
    """Patient-safe partner / healthcare company summary on a listing."""

    id: str
    name: str
    company_type: Optional[str] = None
    district: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_open: bool = True


class ProductListingOut(FarumasiBaseModel):
    id: str
    product_id: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    price: float
    unit_price: Optional[float] = None
    stock_quantity: int
    availability_status: str
    expiry_date: Optional[datetime] = None
    batch_number: Optional[str] = None
    accepted_insurance_ids: Optional[List[str]] = None
    delivery_options: Optional[List[str]] = None
    fulfillment_time_minutes: int
    location_latitude: Optional[float] = None
    location_longitude: Optional[float] = None
    status: str
    created_at: datetime
    product: Optional[ProductOut] = None
    pharmacy: Optional[ListingPharmacyBrief] = None
    partner_company: Optional[ListingPartnerBrief] = None


# ─── Product Requests ─────────────────────────────────────────────────────

class ProductRequestCreate(FarumasiBaseModel):
    product_name: str
    category: Optional[str] = None
    product_type: ProductType = ProductType.MEDICINE
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    intended_use: Optional[str] = None
    proposed_price: Optional[float] = None
    documents_urls: Optional[List[str]] = None

    @field_validator("proposed_price")
    @classmethod
    def _price_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Proposed price cannot be negative")
        return v


class ProductRequestUpdate(FarumasiBaseModel):
    product_name: Optional[str] = None
    category: Optional[str] = None
    product_type: Optional[ProductType] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    intended_use: Optional[str] = None
    proposed_price: Optional[float] = None
    documents_urls: Optional[List[str]] = None


class ProductRequestSubmit(FarumasiBaseModel):
    """Empty body — submit transition is parameter-less."""
    pass


class ProductRequestReview(FarumasiBaseModel):
    """Used for /review — transitions to approved | rejected | more_info_required | under_review."""
    status: ProductRequestStatus
    review_notes: Optional[str] = None
    link_to_product_id: Optional[str] = None  # optionally link to existing catalogue item

    @field_validator("status")
    @classmethod
    def _valid_review_status(cls, v: ProductRequestStatus) -> ProductRequestStatus:
        allowed = {
            ProductRequestStatus.APPROVED,
            ProductRequestStatus.REJECTED,
            ProductRequestStatus.MORE_INFO_REQUIRED,
            ProductRequestStatus.UNDER_REVIEW,
        }
        if v not in allowed:
            raise ValueError(
                "Review status must be one of: approved, rejected, more_info_required, under_review"
            )
        return v


class ProductRequestOut(FarumasiBaseModel):
    id: str
    requester_user_id: str
    requester_type: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    product_name: str
    category: Optional[str] = None
    product_type: str
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    intended_use: Optional[str] = None
    proposed_price: Optional[float] = None
    documents_urls: Optional[List[str]] = None
    status: str
    review_notes: Optional[str] = None
    reviewed_by_pharmacist_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


# ─── Product Categories ───────────────────────────────────────────────────

class ProductCategoryCreate(FarumasiBaseModel):
    name: str
    icon_name: str = "general"
    display_order: int = 0


class ProductCategoryUpdate(FarumasiBaseModel):
    name: Optional[str] = None
    icon_name: Optional[str] = None
    display_order: Optional[int] = None


class ProductCategoryOut(FarumasiBaseModel):
    id: str
    name: str
    icon_name: str
    is_default: bool
    display_order: int
    created_at: datetime
