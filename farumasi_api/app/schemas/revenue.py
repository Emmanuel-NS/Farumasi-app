from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from pydantic import field_validator, model_validator

from app.schemas.common import FarumasiBaseModel
from app.core.constants import RevenueStatus, WithdrawalStatus


def coerce_payout_details(value: Any) -> Optional[dict]:
    """SQLite Text columns may return JSON payout_details as a string."""
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None
    return None


def payout_account_from_details(details: Any) -> Optional[str]:
    normalized = coerce_payout_details(details)
    if not normalized:
        return None
    for key in ("account", "momo_code", "phone", "mobile", "account_number", "msisdn"):
        val = normalized.get(key)
        if val:
            return str(val).strip() or None
    return None


def payout_account_name_from_details(details: Any) -> Optional[str]:
    normalized = coerce_payout_details(details)
    if not normalized:
        return None
    for key in ("account_name", "account_holder_name", "holder_name", "name"):
        val = normalized.get(key)
        if val and str(val).strip():
            return str(val).strip()
    return None


class RevenueOut(FarumasiBaseModel):
    id: str
    order_id: str
    order_code: Optional[str] = None
    order_status: Optional[str] = None
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
    pending_settlement_count: int = 0
    available_settlement_count: int = 0
    withdrawn_settlement_count: int = 0
    reassigned_orders: int = 0
    reassigned_lost_net: float = 0.0


class WithdrawalCreate(FarumasiBaseModel):
    amount: float
    payout_method: str
    payout_details: Optional[dict] = None

    @field_validator("amount")
    @classmethod
    def amount_valid(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Withdrawal amount must be greater than zero")
        if v != int(v):
            raise ValueError("Withdrawal amount must be a whole number of RWF")
        return float(int(v))

    @model_validator(mode="after")
    def validate_payout_details(self) -> "WithdrawalCreate":
        details = coerce_payout_details(self.payout_details) or {}
        holder = payout_account_name_from_details(details)
        if not holder:
            raise ValueError("Account holder name is required in payout_details")
        account = payout_account_from_details(details)
        if not account:
            if self.payout_method == "momo_code":
                raise ValueError("MoMo code is required in payout_details")
            raise ValueError("Payout account or phone number is required in payout_details")
        return self


class WithdrawalAmountRequest(FarumasiBaseModel):
    """Seller withdrawal — payout destination comes from registered owner profile."""

    amount: float

    @field_validator("amount")
    @classmethod
    def amount_valid(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Withdrawal amount must be greater than zero")
        if v != int(v):
            raise ValueError("Withdrawal amount must be a whole number of RWF")
        return float(int(v))


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
    payment_reference: Optional[str] = None
    payment_proof_url: Optional[str] = None

    @field_validator("payout_details", mode="before")
    @classmethod
    def normalize_payout_details(cls, value: Any) -> Optional[dict]:
        return coerce_payout_details(value)


class WithdrawalAdminOut(WithdrawalOut):
    """Finance / super-admin view with seller and payout context for manual processing."""

    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    seller_name: Optional[str] = None
    seller_kind: Optional[str] = None
    payout_account: Optional[str] = None
    payout_account_name: Optional[str] = None


class WithdrawalReview(FarumasiBaseModel):
    admin_notes: Optional[str] = None


# Alias used in endpoint handlers
class WithdrawalActionInput(FarumasiBaseModel):
    notes: Optional[str] = None


class MarkWithdrawalPaidInput(FarumasiBaseModel):
    payment_reference: Optional[str] = None
    payment_proof_url: Optional[str] = None
    notes: Optional[str] = None


# Alias for revenue records list response
RevenueRecordOut = RevenueOut
