from __future__ import annotations

from typing import Optional

from pydantic import Field

from app.schemas.common import FarumasiBaseModel


class DraftPharmacyOnboardRequest(FarumasiBaseModel):
    """Super admin creates a pharmacy shell — owner applies publicly later."""

    name: str = Field(min_length=2, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    license_document_url: Optional[str] = None
    supervising_pharmacist_name: Optional[str] = None
    supervising_pharmacist_license: Optional[str] = None
    accepts_delivery: bool = True


class DraftPartnerOnboardRequest(FarumasiBaseModel):
    name: str = Field(min_length=2, max_length=255)
    company_type: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    business_registration_number: Optional[str] = None
    regulatory_authority: Optional[str] = None
    regulatory_license_number: Optional[str] = None
    regulatory_license_document_url: Optional[str] = None
    description: Optional[str] = None


class DraftSellerOut(FarumasiBaseModel):
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    name: str


class PharmacyProfileCompletionOut(FarumasiBaseModel):
    onboarding_completed: bool
    missing_fields: list[str]
    verification_status: Optional[str] = None
