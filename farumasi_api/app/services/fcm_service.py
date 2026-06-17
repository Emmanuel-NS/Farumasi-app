from __future__ import annotations

import json
import logging
import re
from typing import Optional

import httpx
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

_FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_ORDER_ID_RE = re.compile(r"/orders/([^/?#]+)")

_CATEGORY_TO_PREF_KEY: dict[str, str] = {
    "order": "orders",
    "delivery": "orders",
    "prescription": "reminders",
    "payment": "orders",
    "general": "app_updates",
}


def _build_payload(**fields: object) -> str:
    data = {k: v for k, v in fields.items() if v is not None}
    return json.dumps(data, separators=(",", ":"))


class FcmService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._project_id: Optional[str] = None
        self._credentials = None

    @property
    def enabled(self) -> bool:
        return settings.FCM_ENABLED and bool(settings.firebase_service_account())

    def _ensure_credentials(self) -> None:
        if self._credentials is not None:
            return
        info = settings.firebase_service_account()
        if not info:
            raise RuntimeError("Firebase service account is not configured")
        self._project_id = info.get("project_id")
        if not self._project_id:
            raise RuntimeError("Firebase service account JSON missing project_id")
        self._credentials = service_account.Credentials.from_service_account_info(
            info,
            scopes=[_FCM_SCOPE],
        )

    def _access_token(self) -> str:
        self._ensure_credentials()
        assert self._credentials is not None
        if not self._credentials.valid:
            self._credentials.refresh(Request())
        return self._credentials.token

    async def _user_push_allowed(self, user: User, category: Optional[str]) -> bool:
        prefs = user.notification_prefs if isinstance(user.notification_prefs, dict) else {}
        channels = prefs.get("channels") or {}
        if channels.get("push", True) is False:
            return False

        if category in (None, "consult"):
            return True

        pref_key = _CATEGORY_TO_PREF_KEY.get(category)
        if pref_key is None:
            return True

        events = prefs.get("events") or {}
        return events.get(pref_key, True) is not False

    async def _send(
        self,
        token: str,
        title: str,
        body: str,
        data: dict[str, str],
    ) -> bool:
        if not self.enabled:
            return False

        try:
            access_token = self._access_token()
        except Exception as exc:
            logger.warning("FCM auth failed: %s", exc)
            return False

        assert self._project_id is not None
        url = f"https://fcm.googleapis.com/v1/projects/{self._project_id}/messages:send"
        payload = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body},
                "data": data,
                "android": {
                    "priority": "HIGH",
                    "notification": {
                        "channel_id": data.get("channel_id", "farumasi_channel_id"),
                        "sound": "default",
                    },
                },
            }
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            if response.status_code in (404, 410):
                logger.info("FCM token invalid — clearing for device")
                return False
            if response.status_code >= 400:
                logger.warning(
                    "FCM send failed (%s): %s",
                    response.status_code,
                    response.text[:300],
                )
                return False
            return True
        except Exception as exc:
            logger.warning("FCM send error: %s", exc)
            return False

    async def send_to_user(
        self,
        user_id: str,
        title: str,
        body: str,
        data: dict[str, str],
        *,
        category: Optional[str] = None,
    ) -> bool:
        if not self.enabled:
            return False

        user = await self.db.get(User, user_id)
        if not user or not user.fcm_token:
            return False
        if not await self._user_push_allowed(user, category):
            return False

        ok = await self._send(user.fcm_token, title, body, data)
        if not ok and user.fcm_token:
            user.fcm_token = None
            user.fcm_platform = None
            await self.db.flush()
        return ok

    async def send_notification_push(self, user_id: str, notif: Notification) -> bool:
        order_id = None
        if notif.action_url:
            match = _ORDER_ID_RE.search(notif.action_url)
            if match:
                order_id = match.group(1)

        category = notif.category or "general"
        notif_type = "order" if order_id else "tab"
        nav_payload = _build_payload(
            t=notif_type,
            orderId=order_id,
            url=notif.action_url,
            tab=0 if notif_type == "tab" else None,
        )

        data: dict[str, str] = {
            "t": notif_type,
            "channel_id": "farumasi_channel_id",
            "payload": nav_payload,
        }
        if order_id:
            data["orderId"] = order_id
        if notif.action_url:
            data["url"] = notif.action_url

        return await self.send_to_user(
            user_id,
            notif.title,
            notif.message,
            data,
            category=category,
        )

    async def send_consult_message_push(
        self,
        *,
        patient_user_id: str,
        consultation_id: str,
        pharmacist_id: str,
        is_anonymous: bool,
        message_preview: str,
    ) -> bool:
        title = "Pharmacist message" if is_anonymous else "Message from pharmacist"
        body = message_preview[:110]
        nav_payload = _build_payload(
            t="consult",
            consultId=consultation_id,
            pharmacistId=pharmacist_id,
            anon=True if is_anonymous else None,
        )
        data: dict[str, str] = {
            "t": "consult",
            "consultId": consultation_id,
            "pharmacistId": pharmacist_id,
            "channel_id": "farumasi_consult_channel_id",
            "payload": nav_payload,
        }
        if is_anonymous:
            data["anon"] = "true"

        return await self.send_to_user(
            patient_user_id,
            title,
            body,
            data,
            category="consult",
        )
