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

    # ── Phase 9 additional triggers ───────────────────────────────────────
    async def prescription_reviewed(
        self, patient_user_id: str, prescription_id: str, outcome: str
    ) -> None:
        await self.send(
            patient_user_id,
            "Prescription Reviewed",
            f"A pharmacist has reviewed your prescription. Outcome: {outcome}.",
            category="prescription",
            action_url=f"/prescriptions/{prescription_id}",
        )

    async def product_request_submitted(
        self, reviewer_user_id: str, request_id: str, product_name: str
    ) -> None:
        await self.send(
            reviewer_user_id,
            "Product Request Submitted",
            f"A new product request has been submitted: {product_name}.",
            category="product_request",
            action_url=f"/product-requests/{request_id}",
        )

    async def product_request_reviewed(
        self, requester_user_id: str, request_id: str, outcome: str
    ) -> None:
        await self.send(
            requester_user_id,
            "Product Request Update",
            f"Your product request has been {outcome}.",
            category="product_request",
            action_url=f"/product-requests/{request_id}",
        )

    async def withdrawal_requested(
        self, reviewer_user_id: str, withdrawal_id: str, amount: float
    ) -> None:
        await self.send(
            reviewer_user_id,
            "New Withdrawal Request",
            f"A new withdrawal request of RWF {amount:,.0f} is awaiting review.",
            category="withdrawal",
            action_url=f"/withdrawals/{withdrawal_id}",
        )

    async def broadcast_to_role(
        self,
        role: str,
        title: str,
        message: str,
        category: Optional[str] = None,
        action_url: Optional[str] = None,
    ) -> int:
        """Send the same notification to every active user with the given role.

        Returns the number of notifications dispatched.
        """
        from sqlalchemy import select
        from app.models.user import User

        result = await self.db.execute(select(User.id).where(User.role == role))
        ids = [row[0] for row in result.all()]
        for uid in ids:
            await self.send(uid, title, message, category=category, action_url=action_url)
        return len(ids)
