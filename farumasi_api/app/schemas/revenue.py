from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import field_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import RevenueStatus, WithdrawalStatus


class RevenueOut(FarumasiBaseModel):
    id: str
    order_id: str
    partner_type: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    gross_amount: float
    platform_commission: float
    net_amount: float
    status: str
    created_at: datetime


class RevenueSummary(FarumasiBaseModel):
    total_gross: float
    total_commission: float
    total_net: float
    available_balance: float
    pending_balance: float
    withdrawn_total: float


class WithdrawalCreate(FarumasiBaseModel):
    amount: float
    payout_method: str
    payout_details: Optional[dict] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Withdrawal amount must be greater than zero")
        return v


class WithdrawalOut(FarumasiBaseModel):
    id: str
    requester_user_id: str
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    amount: float
    payout_method: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class WithdrawalReview(FarumasiBaseModel):
    admin_notes: Optional[str] = None


# Alias used in endpoint handlers
class WithdrawalActionInput(FarumasiBaseModel):
    notes: Optional[str] = None


# Alias for revenue records list response
RevenueRecordOut = RevenueOut
