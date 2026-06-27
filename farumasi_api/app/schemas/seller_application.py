from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import EmailStr, Field

from app.schemas.common import FarumasiBaseModel


class SellerDraftPharmacyOut(FarumasiBaseModel):
    id: str
    name: str
    district: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    license_number: Optional[str] = None
    license_document_url: Optional[str] = None
    supervising_pharmacist_name: Optional[str] = None
    supervising_pharmacist_license: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SellerDraftPartnerOut(FarumasiBaseModel):
    id: str
    name: str
    company_type: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    business_registration_number: Optional[str] = None
    regulatory_authority: Optional[str] = None
    regulatory_license_number: Optional[str] = None
    regulatory_license_document_url: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SellerApplicationSubmit(FarumasiBaseModel):
    seller_type: str = Field(pattern="^(pharmacy|partner)$")
    source_pharmacy_id: Optional[str] = None
    source_partner_id: Optional[str] = None
    owner_full_name: str = Field(min_length=2, max_length=255)
    owner_email: EmailStr
    owner_phone: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=2, max_length=255)
    payload: dict[str, Any] = Field(default_factory=dict)


class SellerApplicationSubmitResponse(FarumasiBaseModel):
    message: str
    application_id: str
    application_code: str
    email: EmailStr
    expires_minutes: int


class SellerApplicationVerifyRequest(FarumasiBaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=10)
    application_id: str


class SellerApplicationOut(FarumasiBaseModel):
    id: str
    application_code: str
    seller_type: str
    status: str
    source_pharmacy_id: Optional[str] = None
    source_partner_id: Optional[str] = None
    business_name: str
    owner_full_name: str
    owner_email: str
    owner_phone: Optional[str] = None
    district: Optional[str] = None
    payload: dict[str, Any]
    review_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class SellerApplicationReview(FarumasiBaseModel):
    status: str = Field(pattern="^(approved|rejected|under_review)$")
    review_notes: Optional[str] = None
