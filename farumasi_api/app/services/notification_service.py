from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

# Maps notification category values to the corresponding key inside
# notification_prefs["events"].  Only categories listed here are subject to
# preference gating; any other category is always delivered.
_CATEGORY_TO_PREF_KEY: dict[str, str] = {
    "order": "orders",
    "delivery": "orders",
    "prescription": "reminders",
    "payment": "orders",
    "general": "app_updates",
}


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _localized_copy(
        self,
        user_id: str,
        title: str,
        message: str,
        *,
        category: Optional[str],
    ) -> tuple[str, str]:
        from app.models.user import User
        from app.services.translation_service import TranslationService

        user = await self.db.get(User, user_id)
        lang = (getattr(user, "preferred_language", None) or "en").lower()
        if lang == "en":
            return title, message

        prefix = category or "general"
        svc = TranslationService(self.db)
        rows, _ = await svc.translate_batch(
            source_lang="en",
            target_lang=lang,
            items=[
                {"id": "title", "text": title, "context": f"notification:{prefix}:title"},
                {"id": "body", "text": message, "context": f"notification:{prefix}:body"},
            ],
        )
        by_id = {r["id"]: r["text"] for r in rows}
        return by_id.get("title", title), by_id.get("body", message)

    async def send(
        self,
        user_id: str,
        title: str,
        message: str,
        category: Optional[str] = None,
        action_url: Optional[str] = None,
        *,
        translate: bool = True,
    ) -> Optional[Notification]:
        """Insert a notification for *user_id* and return it.

        Returns ``None`` (without inserting) when the user has explicitly
        disabled the relevant event category in their notification preferences.
        """
        if category is not None:
            pref_key = _CATEGORY_TO_PREF_KEY.get(category)
            if pref_key is not None:
                from app.models.user import User

                result = await self.db.execute(
                    select(User.notification_prefs).where(User.id == user_id)
                )
                prefs = result.scalar_one_or_none()
                if isinstance(prefs, dict):
                    events: dict = prefs.get("events", {})
                    # Default is True (enabled); only skip when explicitly False.
                    if events.get(pref_key, True) is False:
                        return None

        if translate:
            title, message = await self._localized_copy(
                user_id, title, message, category=category
            )

        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            category=category,
            action_url=action_url,
        )
        self.db.add(notif)
        await self.db.flush()

        try:
            from app.services.fcm_service import FcmService

            await FcmService(self.db).send_notification_push(user_id, notif)
        except Exception:
            pass

        return notif

    # ── Common notification helpers ───────────────────────────────────────
    async def prescription_created(self, patient_user_id: str, prescription_id: str) -> None:
        await self.send(
            patient_user_id,
            "New Prescription",
            "Your doctor has created a new prescription for you.",
            category="prescription",
            action_url="/prescriptions",
        )

    async def order_placed(
        self, provider_user_id: str, order_id: str, *, order_code: Optional[str] = None
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            provider_user_id,
            "New Order Received",
            f"You have a new order #{code} waiting for your confirmation.",
            category="order",
            action_url=f"/orders/{order_id}",
        )

    async def patient_order_placed(
        self, patient_user_id: str, order_id: str, *, order_code: Optional[str] = None
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            patient_user_id,
            "Order placed",
            f"Your order #{code} was received. Complete payment to confirm, then track status here.",
            category="order",
            action_url=f"/orders/{order_id}",
        )

    async def prescription_cart_ready(
        self, patient_user_id: str, prescription_id: str, *, notes: Optional[str] = None
    ) -> None:
        msg = "Your pharmacist prepared your prescription cart. Review items and checkout when ready."
        if notes:
            msg = f"{msg} Note: {notes}"
        await self.send(
            patient_user_id,
            "Prescription cart ready",
            msg,
            category="prescription",
            action_url=f"/cart?rx={prescription_id}",
        )

    async def payment_failed(
        self, patient_user_id: str, order_id: str, *, order_code: Optional[str] = None
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            patient_user_id,
            "Payment failed",
            f"Payment for order #{code} could not be completed. Open the order to try again.",
            category="payment",
            action_url=f"/orders/{order_id}",
        )

    async def order_status_changed(
        self,
        patient_user_id: str,
        order_id: str,
        status: str,
        *,
        order_code: Optional[str] = None,
    ) -> None:
        from app.models.user import User
        from app.utils.notification_i18n import localized_order_status

        code = order_code or order_id[:8].upper()
        user = await self.db.get(User, patient_user_id)
        lang = getattr(user, "preferred_language", None) if user else None
        title, message = localized_order_status(lang, code=code, status=status)
        await self.send(
            patient_user_id,
            title,
            message,
            category="order",
            action_url=f"/orders/{order_id}",
            translate=False,
        )

    async def delivery_assigned(
        self,
        rider_user_id: str,
        delivery_id: str,
        *,
        order_code: Optional[str] = None,
    ) -> None:
        code = order_code or "your order"
        await self.send(
            rider_user_id,
            "Delivery Assignment",
            f"You have been assigned a delivery for order #{code}.",
            category="delivery",
            action_url=f"/deliveries/{delivery_id}",
        )

    async def delivery_completed(
        self,
        patient_user_id: str,
        order_id: str,
        *,
        order_code: Optional[str] = None,
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            patient_user_id,
            "Order Delivered",
            f"Your order #{code} has been delivered successfully.",
            category="delivery",
            action_url=f"/orders/{order_id}",
        )

    async def withdrawal_status(self, user_id: str, amount: float, status: str) -> None:
        await self.send(
            user_id,
            "Withdrawal Update",
            f"Your withdrawal request of RWF {amount:,.0f} has been {status}.",
            category="withdrawal",
            action_url="/requests?tab=withdrawals",
        )

    async def account_status_changed(self, user_id: str, new_status: str) -> None:
        await self.send(
            user_id,
            "Account Status Update",
            f"Your account status has been updated to: {new_status}. Contact support if you have questions.",
            category="account",
            action_url="/settings",
        )

    # ── Phase 9 additional triggers ───────────────────────────────────────
    async def prescription_reviewed(
        self, patient_user_id: str, prescription_id: str, outcome: str
    ) -> None:
        await self.send(
            patient_user_id,
            "Prescription Reviewed",
            f"A pharmacist has reviewed your prescription. Outcome: {outcome}.",
            category="prescription",
            action_url="/prescriptions",
        )

    async def product_request_submitted(
        self, reviewer_user_id: str, request_id: str, product_name: str
    ) -> None:
        await self.send(
            reviewer_user_id,
            "Product Request Submitted",
            f"A new product request has been submitted: {product_name}.",
            category="product_request",
            action_url="/product-requests",
        )

    async def product_request_reviewed(
        self, requester_user_id: str, request_id: str, outcome: str
    ) -> None:
        await self.send(
            requester_user_id,
            "Product Request Update",
            f"Your product request has been {outcome}.",
            category="product_request",
            action_url="/requests",
        )

    async def withdrawal_requested(
        self, reviewer_user_id: str, withdrawal_id: str, amount: float
    ) -> None:
        await self.send(
            reviewer_user_id,
            "New Withdrawal Request",
            f"A new withdrawal request of RWF {amount:,.0f} is awaiting review.",
            category="withdrawal",
            action_url="/finance/withdrawals",
        )

    async def broadcast_to_role(
        self,
        role: str,
        title: str,
        message: str,
        category: Optional[str] = None,
        action_url: Optional[str] = None,
    ) -> int:
        """Send the same notification to every active user with the given role."""
        from sqlalchemy import select
        from app.models.user import User

        result = await self.db.execute(select(User.id).where(User.role == role))
        ids = [row[0] for row in result.all()]
        for uid in ids:
            await self.send(uid, title, message, category=category, action_url=action_url)
        return len(ids)

    async def dispatch_confirmed(
        self,
        patient_user_id: str,
        order_id: str,
        *,
        order_code: Optional[str] = None,
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            patient_user_id,
            title="Medicines dispatched",
            message=(
                f"Order #{code} has been packed with batch and expiry records. "
                "View dispatch details on your order page."
            ),
            category="order",
            action_url=f"/orders/{order_id}",
        )

    async def pharmacy_reassigned(
        self,
        patient_user_id: str,
        order_id: str,
        *,
        provider_name: str,
        order_code: Optional[str] = None,
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            patient_user_id,
            title="Pharmacy changed",
            message=(
                f"Order #{code} was reassigned to {provider_name} "
                "because the previous partner did not confirm in time."
            ),
            category="order",
            action_url=f"/orders/{order_id}",
        )

    async def order_reassigned_from_partner(
        self,
        provider_user_id: str,
        order_id: str,
        *,
        order_code: Optional[str] = None,
    ) -> None:
        code = order_code or order_id[:8].upper()
        await self.send(
            provider_user_id,
            title="Order reassigned",
            message=(
                f"Order #{code} was reassigned to another partner "
                "after the confirmation window expired."
            ),
            category="order",
            action_url=f"/orders/{order_id}",
        )

    async def medicine_expiry_warning(
        self,
        patient_user_id: str,
        *,
        product_name: str,
        order_code: str,
        order_id: str,
        days_remaining: int,
    ) -> None:
        await self.send(
            patient_user_id,
            title="Medicine expiry reminder",
            message=(
                f"Your {product_name} from order #{order_code} "
                f"expires in {days_remaining} day(s). Plan to use or replace it soon."
            ),
            category="health",
            action_url=f"/orders/{order_id}",
        )
