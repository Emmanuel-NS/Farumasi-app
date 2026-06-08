from __future__ import annotations

from typing import Optional

from pydantic import model_validator

from app.schemas.common import FarumasiBaseModel
from app.schemas.revenue import (
    coerce_payout_details,
    payout_account_from_details,
    payout_account_name_from_details,
)


class PayoutCredentialsIn(FarumasiBaseModel):
    payout_method: str
    payout_details: dict
    verification_code: Optional[str] = None

    @model_validator(mode="after")
    def validate_details(self) -> "PayoutCredentialsIn":
        details = coerce_payout_details(self.payout_details) or {}
        holder = payout_account_name_from_details(details)
        if not holder:
            raise ValueError("Account holder name is required in payout_details")
        account = payout_account_from_details(details)
        if not account:
            if self.payout_method == "momo_code":
                raise ValueError("MoMo code is required in payout_details")
            raise ValueError("Payout account or phone number is required in payout_details")
        self.payout_details = details
        return self


class PayoutCredentialsOut(FarumasiBaseModel):
    configured: bool
    payout_method: Optional[str] = None
    payout_account_masked: Optional[str] = None
    payout_account_name: Optional[str] = None
    updated_at: Optional[str] = None


class PayoutVerificationSentOut(FarumasiBaseModel):
    sent: bool = True
    message: str
    expires_in_minutes: int
