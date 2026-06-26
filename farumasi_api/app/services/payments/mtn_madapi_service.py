from __future__ import annotations

import logging
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TOKEN_URLS = (
    "https://api.mtn.com/oauth/client_credential/accesstoken",
    "https://api.mtn.com/v1/oauth/access_token",
)

_token_cache: dict[str, Any] = {"token": None, "expires_at": 0.0}


class MtnMadapiService:
    """MTN MADAPI Payments V1 — developers.mtn.com (Consumer key + secret)."""

    def is_configured(self) -> bool:
        return bool(settings.MTN_MADAPI_CONSUMER_KEY and settings.MTN_MADAPI_CONSUMER_SECRET)

    def _base_url(self) -> str:
        return (settings.MTN_MADAPI_BASE_URL or "https://api.mtn.com/v1").rstrip("/")

    def _country_code(self) -> str:
        return (settings.MTN_MADAPI_COUNTRY_CODE or "RW").upper()

    def _callback_url(self) -> str:
        if settings.MTN_MADAPI_CALLBACK_URL:
            return settings.MTN_MADAPI_CALLBACK_URL.rstrip("/")
        return f"{settings.API_PUBLIC_URL.rstrip('/')}/api/v1/webhooks/mtn-madapi"

    async def _access_token(self) -> str:
        now = time.time()
        cached = _token_cache.get("token")
        if cached and now < float(_token_cache.get("expires_at") or 0):
            return str(cached)

        last_error = "MTN MADAPI authentication failed"
        async with httpx.AsyncClient(timeout=45.0) as client:
            for token_url in _TOKEN_URLS:
                try:
                    if "client_credential" in token_url:
                        resp = await client.post(
                            token_url,
                            params={"grant_type": "client_credentials"},
                            data={
                                "client_id": settings.MTN_MADAPI_CONSUMER_KEY,
                                "client_secret": settings.MTN_MADAPI_CONSUMER_SECRET,
                            },
                            headers={"Content-Type": "application/x-www-form-urlencoded"},
                        )
                    else:
                        resp = await client.post(
                            token_url,
                            json={
                                "client_id": settings.MTN_MADAPI_CONSUMER_KEY,
                                "client_secret": settings.MTN_MADAPI_CONSUMER_SECRET,
                                "grant_type": "client_credentials",
                            },
                            headers={
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                            },
                        )
                    data = resp.json() if resp.content else {}
                    token = data.get("access_token") or data.get("accessToken")
                    if resp.status_code < 400 and token:
                        ttl = int(data.get("expires_in") or data.get("expiresIn") or 3600)
                        _token_cache["token"] = token
                        _token_cache["expires_at"] = now + max(60, ttl - 60)
                        return str(token)
                    last_error = data.get("error_description") or data.get("message") or resp.text[:300]
                except Exception as exc:
                    last_error = str(exc)
                    logger.info("MTN MADAPI token failed at %s: %s", token_url, exc)

        raise RuntimeError(last_error)

    async def request_momo_payment(
        self,
        *,
        transaction_id: str,
        amount: float,
        currency: str,
        msisdn: str,
        payer_name: str,
        description: str,
    ) -> dict[str, Any]:
        token = await self._access_token()
        url = f"{self._base_url()}/payments"
        callback = self._callback_url()
        payload: dict[str, Any] = {
            "payer": {
                "payerIdType": "MSISDN",
                "payerId": msisdn,
                "payerName": payer_name[:80],
            },
            "payee": [
                {
                    "totalAmount": {
                        "amount": str(int(round(amount))),
                        "units": currency,
                    },
                    "payeeNote": description[:160],
                    "callbackURL": callback,
                }
            ],
            "externalTransactionId": transaction_id,
            "correlatorId": transaction_id,
            "description": description[:160],
            "callbackURL": callback,
        }
        if settings.MTN_MADAPI_TARGET_SYSTEM:
            payload["targetSystem"] = settings.MTN_MADAPI_TARGET_SYSTEM

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "countryCode": self._country_code(),
            "transactionId": transaction_id,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        try:
            body = resp.json() if resp.content else {}
        except ValueError:
            body = {"raw": (resp.text or "")[:500]}

        if resp.status_code >= 400:
            message = (
                body.get("statusMessage")
                or body.get("message")
                or body.get("error")
                or resp.text[:400]
            )
            raise RuntimeError(f"MTN payment request failed ({resp.status_code}): {message}")

        data = body.get("data")
        provider_tx = (
            body.get("transactionId")
            or (data.get("transactionId") if isinstance(data, dict) else None)
            or transaction_id
        )
        return {
            "transaction_id": transaction_id,
            "provider_transaction_id": str(provider_tx),
            "http_status": resp.status_code,
            "body": body,
        }

    async def get_transaction_status(self, correlator_id: str) -> Optional[dict[str, Any]]:
        token = await self._access_token()
        url = f"{self._base_url()}/{correlator_id}/transactionStatus"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "countryCode": self._country_code(),
            "transactionId": correlator_id,
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code >= 400:
            logger.warning("MTN status check failed for %s: %s", correlator_id, resp.text[:300])
            return None
        try:
            return resp.json()
        except ValueError:
            return None

    @staticmethod
    def is_payment_successful(status_data: dict[str, Any]) -> bool:
        text = " ".join(
            str(status_data.get(k) or "")
            for k in ("status", "statusMessage", "statusCode", "paymentStatus", "state")
        ).upper()
        if any(x in text for x in ("SUCCESS", "COMPLETED", "SUCCESSFUL", "PAID", "APPROVED")):
            return True
        code = str(status_data.get("statusCode") or "").strip()
        return code in ("200", "0", "00", "0000")

    @staticmethod
    def is_payment_failed(status_data: dict[str, Any]) -> bool:
        text = " ".join(
            str(status_data.get(k) or "")
            for k in ("status", "statusMessage", "statusCode", "paymentStatus", "state")
        ).upper()
        return any(
            x in text
            for x in ("FAILED", "REJECTED", "CANCELLED", "CANCELED", "DECLINED", "EXPIRED", "TIMEOUT")
        )
