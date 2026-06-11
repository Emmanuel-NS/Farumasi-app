from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_PESAPAL_BASE = {
    "sandbox": "https://cybqa.pesapal.com/pesapalv3/api",
    "live": "https://pay.pesapal.com/v3/api",
}

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}
_ipn_id_cache: Optional[str] = None


class PesapalService:
    """Pesapal API 3.0 — hosted checkout (cards + mobile money in Rwanda)."""

    def is_configured(self) -> bool:
        return bool(settings.PESAPAL_CONSUMER_KEY and settings.PESAPAL_CONSUMER_SECRET)

    def _base_url(self) -> str:
        env = (settings.PESAPAL_ENV or "sandbox").lower()
        return _PESAPAL_BASE.get(env, _PESAPAL_BASE["sandbox"])

    async def _request_token(self) -> str:
        now = time.time()
        cached = _token_cache.get("token")
        if cached and now < float(_token_cache.get("expires_at") or 0):
            return cached

        url = f"{self._base_url()}/Auth/RequestToken"
        payload = {
            "consumer_key": settings.PESAPAL_CONSUMER_KEY,
            "consumer_secret": settings.PESAPAL_CONSUMER_SECRET,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"Accept": "application/json", "Content-Type": "application/json"},
            )
        data = resp.json()
        if resp.status_code >= 400 or not data.get("token"):
            message = data.get("message") or resp.text
            raise RuntimeError(message or "Pesapal authentication failed")

        _token_cache["token"] = data["token"]
        _token_cache["expires_at"] = now + 4 * 60  # refresh before 5-min expiry
        return data["token"]

    async def _auth_headers(self) -> dict[str, str]:
        token = await self._request_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _ipn_callback_url(self) -> str:
        if settings.PESAPAL_IPN_URL:
            return settings.PESAPAL_IPN_URL.rstrip("/")
        base = settings.API_PUBLIC_URL.rstrip("/")
        return f"{base}/api/v1/webhooks/pesapal"

    async def get_ipn_id(self) -> str:
        global _ipn_id_cache
        if settings.PESAPAL_IPN_ID:
            return settings.PESAPAL_IPN_ID
        if _ipn_id_cache:
            return _ipn_id_cache

        headers = await self._auth_headers()
        url = f"{self._base_url()}/URLSetup/RegisterIPN"
        payload = {
            "url": self._ipn_callback_url(),
            "ipn_notification_type": "POST",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
        data = resp.json()
        ipn_id = data.get("ipn_id")
        if resp.status_code >= 400 or not ipn_id:
            message = data.get("message") or data.get("error") or resp.text
            raise RuntimeError(
                f"Pesapal IPN registration failed: {message}. "
                "Set PESAPAL_IPN_ID in .env after registering your IPN URL in the Pesapal dashboard."
            )
        _ipn_id_cache = ipn_id
        logger.info("Pesapal IPN registered (id=%s). Add PESAPAL_IPN_ID=%s to .env", ipn_id, ipn_id)
        return ipn_id

    async def submit_order(
        self,
        *,
        merchant_reference: str,
        amount: float,
        currency: str,
        description: str,
        callback_url: str,
        email: str,
        phone: str,
        first_name: str,
        last_name: str,
        country_code: str = "RW",
    ) -> dict[str, str]:
        notification_id = await self.get_ipn_id()
        headers = await self._auth_headers()
        payload = {
            "id": merchant_reference,
            "currency": currency,
            "amount": float(amount),
            "description": description[:100],
            "callback_url": callback_url,
            "redirect_mode": "TOP_WINDOW",
            "notification_id": notification_id,
            "branch": settings.APP_NAME,
            "billing_address": {
                "email_address": email,
                "phone_number": phone,
                "country_code": country_code,
                "first_name": first_name,
                "last_name": last_name,
            },
        }
        url = f"{self._base_url()}/Transactions/SubmitOrderRequest"
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
        data = resp.json()
        if resp.status_code >= 400 or not data.get("redirect_url"):
            message = data.get("message") or resp.text
            logger.error("Pesapal submit order failed: %s", message[:500])
            raise RuntimeError(message or "Pesapal could not start checkout")

        return {
            "redirect_url": data["redirect_url"],
            "order_tracking_id": data.get("order_tracking_id") or "",
            "merchant_reference": data.get("merchant_reference") or merchant_reference,
        }

    async def get_transaction_status(self, order_tracking_id: str) -> Optional[dict[str, Any]]:
        headers = await self._auth_headers()
        url = f"{self._base_url()}/Transactions/GetTransactionStatus"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                params={"orderTrackingId": order_tracking_id},
                headers=headers,
            )
        if resp.status_code >= 400:
            logger.warning("Pesapal status failed for %s: %s", order_tracking_id, resp.text[:300])
            return None
        body = resp.json()
        if str(body.get("status")) != "200":
            return None
        return body

    @staticmethod
    def is_payment_completed(status_data: dict[str, Any]) -> bool:
        desc = (status_data.get("payment_status_description") or "").upper()
        code = status_data.get("status_code")
        return desc == "COMPLETED" or code == 1

    @staticmethod
    def is_payment_failed(status_data: dict[str, Any]) -> bool:
        desc = (status_data.get("payment_status_description") or "").upper()
        code = status_data.get("status_code")
        return desc in ("FAILED", "INVALID", "REVERSED") or code in (0, 2, 3)
