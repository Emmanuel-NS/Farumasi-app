from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import FarumasiBaseModel
from app.schemas.revenue import RevenueSummary, WithdrawalOut, RevenueOut
from app.schemas.seller_change_request import SellerChangeRequestOut
from app.schemas.user import UserOut
from app.core.constants import UserRole


_ADMIN_ROLES = {
    UserRole.SUPER_ADMIN,
    UserRole.OPERATIONS_ADMIN,
    UserRole.FINANCE_ADMIN,
    UserRole.COMPLIANCE_ADMIN,
}

_STAFF_ROLES = {
    UserRole.PHARMACIST,
    UserRole.RIDER,
    *_ADMIN_ROLES,
}


class AdminCreateUserRequest(FarumasiBaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    temporary_password: Optional[str] = Field(default=None, min_length=8, max_length=128)

    @field_validator("role")
    @classmethod
    def allowed_role(cls, v: UserRole) -> UserRole:
        if v not in _STAFF_ROLES:
            raise ValueError(
                "Use onboard endpoints for pharmacy/partner accounts; "
                f"allowed roles: {', '.join(sorted(r.value for r in _STAFF_ROLES))}"
            )
        return v


class AdminCreateUserResponse(FarumasiBaseModel):
    user: UserOut
    temporary_password: str


class OnboardPharmacyRequest(FarumasiBaseModel):
    owner_full_name: str = Field(min_length=2, max_length=255)
    owner_email: EmailStr
    owner_phone: Optional[str] = None
    temporary_password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    commission_rate_percent: float = Field(ge=0, le=100)
    logo_url: Optional[str] = None
    accepts_delivery: bool = True


class OnboardPartnerRequest(FarumasiBaseModel):
    owner_full_name: str = Field(min_length=2, max_length=255)
    owner_email: EmailStr
    owner_phone: Optional[str] = None
    temporary_password: Optional[str] = Field(default=None, min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=255)
    company_type: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None
    commission_rate_percent: float = Field(ge=0, le=100)
    logo_url: Optional[str] = None
    description: Optional[str] = None


class OnboardSellerResponse(FarumasiBaseModel):
    owner: UserOut
    temporary_password: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None


class SellerFinanceSummary(FarumasiBaseModel):
    seller_type: str
    seller_id: str
    seller_name: str
    commission_rate_percent: Optional[float] = None
    owner: Optional[UserOut] = None
    revenue: RevenueSummary
    recent_withdrawals: list[WithdrawalOut]
    recent_revenue_records: list[RevenueOut] = []
    pending_change_requests: list[SellerChangeRequestOut] = []
    wallet_scope: str = "owner"
    wallet_scope_note: Optional[str] = None
    created_at: Optional[datetime] = None


class PrescriptionStatusCount(FarumasiBaseModel):
    status: str
    label: str
    count: int


class PrescriptionAdminSummary(FarumasiBaseModel):
    total: int
    by_status: list[PrescriptionStatusCount]
    with_cart_items: int
    without_cart_items: int
    total_cart_items: int
    types: list[PrescriptionStatusCount]
    # Pharmacist-portal aligned buckets
    new_requests: int = 0
    under_review: int = 0
    cart_sent: int = 0
    fulfilled: int = 0
    cancelled_expired: int = 0


class OrderAdminSummary(FarumasiBaseModel):
    total: int
    pending: int
    in_progress: int
    completed: int
    cancelled: int
    prescription_orders: int
    partner_orders: int
    prescription_pending: int = 0
    prescription_in_progress: int = 0
    prescription_completed: int = 0
    prescription_cancelled: int = 0
    completed_revenue: float


class ProductTypeInsight(FarumasiBaseModel):
    product_type: str
    label: str
    total: int
    prescription_required: int
    over_the_counter: int


class PatientCatalogInsights(FarumasiBaseModel):
    """Active patient-visible listings grouped by catalogue product type."""
    total_listings: int
    by_type: list[ProductTypeInsight]
