from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_FLW_V3_BASE = "https://api.flutterwave.com/v3"
_FLW_OAUTH_URL = (
    "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token"
)

# Rwanda (RWF): all methods Flutterwave supports — first option opens as default tab.
_RWANDA_PAYMENT_OPTIONS = "mobilemoneyrwanda,card"

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}


class FlutterwaveService:
    """Flutterwave Standard checkout (card + Rwanda mobile money)."""

    def is_configured(self) -> bool:
        if settings.FLUTTERWAVE_SECRET_KEY:
            return True
        return bool(
            settings.FLUTTERWAVE_CLIENT_ID and settings.FLUTTERWAVE_CLIENT_SECRET
        )

    def _payment_options(self) -> str:
        raw = (settings.FLUTTERWAVE_PAYMENT_OPTIONS or "").strip()
        if raw:
            return raw.replace(" ", "")
        if (settings.PAYMENT_CURRENCY or "RWF").upper() == "RWF":
            return _RWANDA_PAYMENT_OPTIONS
        return "card,mobilemoneyrwanda"

    async def _bearer_token(self) -> str:
        legacy = (settings.FLUTTERWAVE_SECRET_KEY or "").strip()
        if legacy.startswith("FLWSECK"):
            return legacy

        client_id = (settings.FLUTTERWAVE_CLIENT_ID or "").strip()
        client_secret = (
            (settings.FLUTTERWAVE_CLIENT_SECRET or "").strip() or legacy
        )
        if not client_id or not client_secret:
            raise RuntimeError(
                "Flutterwave is not configured. Set FLUTTERWAVE_CLIENT_ID and "
                "FLUTTERWAVE_CLIENT_SECRET (sandbox) or FLUTTERWAVE_SECRET_KEY (v3)."
            )

        now = time.time()
        cached = _token_cache.get("token")
        if cached and float(_token_cache.get("expires_at") or 0) > now + 60:
            return str(cached)

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _FLW_OAUTH_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if resp.status_code != 200:
                logger.error(
                    "Flutterwave OAuth failed: %s %s",
                    resp.status_code,
                    resp.text[:400],
                )
                resp.raise_for_status()
            data = resp.json()

        token = data.get("access_token")
        if not token:
            raise RuntimeError("Flutterwave OAuth did not return an access token")
        expires_in = int(data.get("expires_in") or 3600)
        _token_cache["token"] = token
        _token_cache["expires_at"] = now + expires_in
        return str(token)

    def _headers(self, bearer: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {bearer}",
            "Content-Type": "application/json",
        }

    async def initialize_payment(
        self,
        *,
        tx_ref: str,
        amount: float,
        currency: str,
        redirect_url: str,
        customer_email: str,
        customer_phone: str,
        customer_name: str,
        title: str = "FARUMASI",
        description: str = "",
    ) -> dict[str, Any]:
        bearer = await self._bearer_token()
        payload = {
            "tx_ref": tx_ref,
            "amount": amount,
            "currency": currency,
            "redirect_url": redirect_url,
            "payment_options": self._payment_options(),
            "customer": {
                "email": customer_email,
                "phonenumber": customer_phone,
                "name": customer_name,
            },
            "customizations": {
                "title": title,
                "description": (description or "FARUMASI order payment")[:100],
            },
        }
        trace_id = str(uuid.uuid4())
        headers = self._headers(bearer)
        headers["X-Trace-Id"] = trace_id

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{_FLW_V3_BASE}/payments",
                headers=headers,
                json=payload,
            )
            if resp.status_code not in (200, 201):
                logger.error(
                    "Flutterwave init failed: %s %s",
                    resp.status_code,
                    resp.text[:500],
                )
                if resp.status_code == 401:
                    raise RuntimeError(
                        "Flutterwave authentication failed. For sandbox v4, use "
                        "FLUTTERWAVE_CLIENT_ID + FLUTTERWAVE_CLIENT_SECRET. "
                        "Alternatively add a v3 test secret key (FLWSECK_TEST-…) "
                        "from Settings → Developers → API keys."
                    )
                resp.raise_for_status()
            data = resp.json()
        if data.get("status") != "success":
            message = data.get("message") or "Flutterwave could not start checkout"
            raise RuntimeError(str(message))
        link = (data.get("data") or {}).get("link")
        if not link:
            raise RuntimeError("Flutterwave did not return a checkout link")
        return {
            "link": link,
            "flw_ref": (data.get("data") or {}).get("id"),
        }

    async def verify_by_reference(self, tx_ref: str) -> Optional[dict[str, Any]]:
        bearer = await self._bearer_token()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{_FLW_V3_BASE}/transactions/verify_by_reference",
                params={"tx_ref": tx_ref},
                headers=self._headers(bearer),
            )
            if resp.status_code == 404:
                return None
            if resp.status_code != 200:
                logger.warning(
                    "Flutterwave verify failed for %s: %s",
                    tx_ref,
                    resp.text[:300],
                )
                return None
            data = resp.json()
        if data.get("status") != "success":
            return None
        return data.get("data")

    @staticmethod
    def is_payment_successful(data: dict[str, Any]) -> bool:
        status = str(data.get("status") or "").lower()
        return status == "successful"

    @staticmethod
    def is_payment_failed(data: dict[str, Any]) -> bool:
        status = str(data.get("status") or "").lower()
        return status in ("failed", "cancelled")

    @staticmethod
    def verify_webhook_hash(header_hash: str) -> bool:
        secret = (settings.FLUTTERWAVE_WEBHOOK_SECRET or "").strip()
        if not secret or not header_hash:
            return False
        return header_hash.strip() == secret
