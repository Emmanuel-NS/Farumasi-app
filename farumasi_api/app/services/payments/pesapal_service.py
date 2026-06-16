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

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0, "base": None}
_ipn_id_cache: Optional[str] = None
_resolved_base_url: Optional[str] = None


class PesapalService:
    """Pesapal API 3.0 — hosted checkout (cards + mobile money in Rwanda)."""

    def is_configured(self) -> bool:
        return bool(settings.PESAPAL_CONSUMER_KEY and settings.PESAPAL_CONSUMER_SECRET)

    def _candidate_bases(self) -> list[str]:
        env = (settings.PESAPAL_ENV or "sandbox").lower()
        if env == "live":
            return [_PESAPAL_BASE["live"]]
        # Many merchant keys only work on live — try sandbox first, then live.
        return [_PESAPAL_BASE["sandbox"], _PESAPAL_BASE["live"]]

    async def _resolve_base_url(self) -> str:
        global _resolved_base_url
        if _resolved_base_url:
            return _resolved_base_url

        last_error = "Pesapal authentication failed"
        for base in self._candidate_bases():
            try:
                token = await self._request_token_for_base(base)
                _resolved_base_url = base
                _token_cache["token"] = token
                _token_cache["expires_at"] = time.time() + 4 * 60
                _token_cache["base"] = base
                if base == _PESAPAL_BASE["live"] and (settings.PESAPAL_ENV or "").lower() != "live":
                    logger.warning(
                        "Pesapal credentials work on LIVE API but PESAPAL_ENV=%s — set PESAPAL_ENV=live",
                        settings.PESAPAL_ENV,
                    )
                return base
            except Exception as exc:
                last_error = str(exc)
                logger.info("Pesapal auth failed for %s: %s", base, exc)

        raise RuntimeError(last_error)

    async def _request_token_for_base(self, base: str) -> str:
        url = f"{base}/Auth/RequestToken"
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
        try:
            data = resp.json()
        except ValueError as exc:
            snippet = (resp.text or "")[:200]
            raise RuntimeError(
                f"Pesapal auth returned non-JSON (HTTP {resp.status_code}): {snippet}"
            ) from exc

        if resp.status_code >= 400 or not data.get("token"):
            message = data.get("message") or data.get("error") or resp.text
            raise RuntimeError(message or "Pesapal authentication failed")
        return data["token"]

    async def _request_token(self) -> str:
        now = time.time()
        cached = _token_cache.get("token")
        if cached and now < float(_token_cache.get("expires_at") or 0):
            return cached

        base = await self._resolve_base_url()
        token = await self._request_token_for_base(base)
        _token_cache["token"] = token
        _token_cache["expires_at"] = now + 4 * 60
        _token_cache["base"] = base
        return token

    def _base_url(self) -> str:
        if _resolved_base_url:
            return _resolved_base_url
        env = (settings.PESAPAL_ENV or "sandbox").lower()
        return _PESAPAL_BASE.get(env, _PESAPAL_BASE["sandbox"])

    async def _auth_headers(self) -> dict[str, str]:
        token = await self._request_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _ipn_callback_url(self) -> str:
        if settings.PESAPAL_IPN_ID and settings.PESAPAL_IPN_URL:
            return settings.PESAPAL_IPN_URL.rstrip("/")
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

        await self._resolve_base_url()
        headers = await self._auth_headers()
        url = f"{self._base_url()}/URLSetup/RegisterIPN"
        payload = {
            "url": self._ipn_callback_url(),
            "ipn_notification_type": "POST",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
        try:
            data = resp.json()
        except ValueError as exc:
            raise RuntimeError(
                f"Pesapal IPN registration returned non-JSON: {(resp.text or '')[:200]}"
            ) from exc

        ipn_id = data.get("ipn_id")
        if resp.status_code >= 400 or not ipn_id:
            message = data.get("message") or data.get("error") or resp.text
            raise RuntimeError(
                f"Pesapal IPN registration failed: {message}. "
                "Set PESAPAL_IPN_ID in .env after registering your IPN URL."
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
        await self._resolve_base_url()
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
        try:
            data = resp.json()
        except ValueError as exc:
            raise RuntimeError(
                f"Pesapal submit order returned non-JSON: {(resp.text or '')[:300]}"
            ) from exc

        if resp.status_code >= 400 or not data.get("redirect_url"):
            message = data.get("message") or data.get("error") or resp.text
            logger.error("Pesapal submit order failed: %s", str(message)[:500])
            raise RuntimeError(message or "Pesapal could not start checkout")

        return {
            "redirect_url": data["redirect_url"],
            "order_tracking_id": data.get("order_tracking_id") or "",
            "merchant_reference": data.get("merchant_reference") or merchant_reference,
        }

    async def get_transaction_status(self, order_tracking_id: str) -> Optional[dict[str, Any]]:
        await self._resolve_base_url()
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
        try:
            body = resp.json()
        except ValueError:
            return None
        if str(body.get("status")) not in ("200", "200.0") and body.get("status") != 200:
            # Some responses omit HTTP status but include payment fields — still usable.
            if not body.get("payment_status_description"):
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
