from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def send(
        self,
        user_id: str,
        title: str,
        message: str,
        category: Optional[str] = None,
        action_url: Optional[str] = None,
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            category=category,
            action_url=action_url,
        )
        self.db.add(notif)
        await self.db.flush()
        return notif

    # ── Common notification helpers ───────────────────────────────────────
    async def prescription_created(self, patient_user_id: str, prescription_id: str) -> None:
        await self.send(
            patient_user_id,
            "New Prescription",
            "Your doctor has created a new prescription for you.",
            category="prescription",
            action_url=f"/prescriptions/{prescription_id}",
        )

    async def order_placed(self, provider_user_id: str, order_code: str) -> None:
        await self.send(
            provider_user_id,
            "New Order Received",
            f"You have a new order #{order_code} waiting for your confirmation.",
            category="order",
            action_url=f"/orders/{order_code}",
        )

    async def order_status_changed(self, patient_user_id: str, order_code: str, status: str) -> None:
        await self.send(
            patient_user_id,
            "Order Update",
            f"Your order #{order_code} status has changed to: {status}.",
            category="order",
            action_url=f"/orders/{order_code}",
        )

    async def delivery_assigned(self, rider_user_id: str, order_code: str) -> None:
        await self.send(
            rider_user_id,
            "Delivery Assignment",
            f"You have been assigned a delivery for order #{order_code}.",
            category="delivery",
        )

    async def delivery_completed(self, patient_user_id: str, order_code: str) -> None:
        await self.send(
            patient_user_id,
            "Order Delivered",
            f"Your order #{order_code} has been delivered successfully.",
            category="delivery",
        )

    async def withdrawal_status(self, user_id: str, amount: float, status: str) -> None:
        await self.send(
            user_id,
            "Withdrawal Update",
            f"Your withdrawal request of RWF {amount:,.0f} has been {status}.",
            category="revenue",
        )

    async def account_status_changed(self, user_id: str, new_status: str) -> None:
        await self.send(
            user_id,
            "Account Status Update",
            f"Your account status has been updated to: {new_status}. Contact support if you have questions.",
            category="account",
        )
