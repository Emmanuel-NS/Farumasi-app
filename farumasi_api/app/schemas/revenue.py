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
    # Legacy aliases (kept so any existing client/test keeps working).
    total_gross: float
    total_commission: float
    total_net: float
    available_balance: float
    pending_balance: float
    withdrawn_total: float

    # Phase 8.2 canonical fields.
    gross_revenue: float
    platform_commission: float
    net_revenue: float
    withdrawn_amount: float
    pending_withdrawals: float
    paid_withdrawals: float
    total_orders: int
    completed_orders: int


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
    payout_details: Optional[dict] = None
    status: str
    admin_notes: Optional[str] = None
    processed_by_user_id: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class WithdrawalReview(FarumasiBaseModel):
    admin_notes: Optional[str] = None


# Alias used in endpoint handlers
class WithdrawalActionInput(FarumasiBaseModel):
    notes: Optional[str] = None


# Alias for revenue records list response
RevenueRecordOut = RevenueOut
