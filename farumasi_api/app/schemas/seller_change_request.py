from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import Field

from app.schemas.common import FarumasiBaseModel


class SellerChangeRequestCreate(FarumasiBaseModel):
    field_name: str = Field(default="commission_rate_percent")
    proposed_value: str = Field(min_length=1, max_length=255)
    admin_note: Optional[str] = None


class SellerChangeRequestPartnerAction(FarumasiBaseModel):
    partner_note: Optional[str] = None


class SellerChangeRequestOut(FarumasiBaseModel):
    id: str
    seller_type: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    seller_name: Optional[str] = None
    owner_user_id: str
    requested_by_user_id: str
    requested_by_name: Optional[str] = None
    field_name: str
    field_label: str
    current_value: Optional[str] = None
    proposed_value: str
    status: str
    admin_note: Optional[str] = None
    partner_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
