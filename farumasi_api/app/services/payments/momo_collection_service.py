from __future__ import annotations

import logging
import re
import uuid
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_MOMO_BASE = {
    "sandbox": "https://sandbox.momodeveloper.mtn.com",
    "production": "https://proxy.momoapi.mtn.com",
}


def normalize_rwanda_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw.strip())
    if digits.startswith("250"):
        return digits
    if digits.startswith("0"):
        return "250" + digits[1:]
    if len(digits) == 9:
        return "250" + digits
    raise ValueError("Enter a valid Rwanda mobile number (e.g. 0781234567)")


class MomoCollectionService:
    """MTN MoMo Collection API (RequestToPay)."""

    def is_configured(self) -> bool:
        return bool(
            settings.MTN_MOMO_SUBSCRIPTION_KEY
            and settings.MTN_MOMO_API_USER
            and settings.MTN_MOMO_API_KEY
        )

    def _base_url(self) -> str:
        env = (settings.MTN_MOMO_ENV or "sandbox").lower()
        return _MOMO_BASE.get(env, _MOMO_BASE["sandbox"])

    async def _access_token(self) -> str:
        url = f"{self._base_url()}/collection/token/"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                auth=(settings.MTN_MOMO_API_USER, settings.MTN_MOMO_API_KEY),
                headers={"Ocp-Apim-Subscription-Key": settings.MTN_MOMO_SUBSCRIPTION_KEY},
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    async def request_to_pay(
        self,
        *,
        reference_id: str,
        amount: float,
        phone: str,
        payer_message: str = "FARUMASI order payment",
    ) -> str:
        token = await self._access_token()
        url = f"{self._base_url()}/collection/v1_0/requesttopay"
        body = {
            "amount": str(int(amount)),
            "currency": settings.MTN_MOMO_CURRENCY,
            "externalId": reference_id[:36],
            "payer": {"partyIdType": "MSISDN", "partyId": phone},
            "payerMessage": payer_message[:160],
            "payeeNote": "FARUMASI",
        }
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Reference-Id": reference_id,
            "X-Target-Environment": settings.MTN_MOMO_TARGET_ENVIRONMENT,
            "Ocp-Apim-Subscription-Key": settings.MTN_MOMO_SUBSCRIPTION_KEY,
            "Content-Type": "application/json",
        }
        if settings.MTN_MOMO_CALLBACK_URL:
            headers["X-Callback-Url"] = settings.MTN_MOMO_CALLBACK_URL

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=body, headers=headers)
            if resp.status_code not in (200, 202):
                logger.error("MoMo RequestToPay failed: %s %s", resp.status_code, resp.text)
                resp.raise_for_status()
        return reference_id

    async def get_status(self, reference_id: str) -> Optional[str]:
        token = await self._access_token()
        url = f"{self._base_url()}/collection/v1_0/requesttopay/{reference_id}"
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Target-Environment": settings.MTN_MOMO_TARGET_ENVIRONMENT,
            "Ocp-Apim-Subscription-Key": settings.MTN_MOMO_SUBSCRIPTION_KEY,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json().get("status")
