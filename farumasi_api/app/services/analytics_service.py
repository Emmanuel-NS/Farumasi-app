from __future__ import annotations

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.order import Order
from app.models.delivery import Delivery
from app.models.prescription import DigitalPrescription
from app.models.revenue import RevenueRecord, WithdrawalRequest
from app.models.pharmacy import Pharmacy
from app.models.doctor import DoctorProfile
from app.models.rider import RiderProfile
from app.models.patient import PatientProfile
from app.core.constants import OrderStatus, RevenueStatus, WithdrawalStatus


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def admin_summary(self) -> dict:
        """High-level KPI dashboard for super admin."""
        total_users = (await self.db.execute(select(func.count(User.id)))).scalar_one()
        total_orders = (await self.db.execute(select(func.count(Order.id)))).scalar_one()
        completed_orders = (await self.db.execute(
            select(func.count(Order.id)).where(Order.order_status == OrderStatus.COMPLETED)
        )).scalar_one()
        total_revenue_net = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(RevenueRecord.status == RevenueStatus.AVAILABLE)
        )).scalar_one()
        total_pharmacies = (await self.db.execute(select(func.count(Pharmacy.id)))).scalar_one()
        pending_withdrawals = (await self.db.execute(
            select(func.count(WithdrawalRequest.id)).where(
                WithdrawalRequest.status == WithdrawalStatus.PENDING
            )
        )).scalar_one()
        total_prescriptions = (await self.db.execute(
            select(func.count(DigitalPrescription.id))
        )).scalar_one()
        total_riders = (await self.db.execute(select(func.count(RiderProfile.id)))).scalar_one()
        total_doctors = (await self.db.execute(select(func.count(DoctorProfile.id)))).scalar_one()
        total_patients = (await self.db.execute(select(func.count(PatientProfile.id)))).scalar_one()

        return {
            "total_users": total_users,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_pharmacies": total_pharmacies,
            "total_riders": total_riders,
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_prescriptions": total_prescriptions,
            "available_revenue_net": float(total_revenue_net),
            "pending_withdrawals": pending_withdrawals,
        }

    async def pharmacy_stats(self, pharmacy_id: str) -> dict:
        total_orders = (await self.db.execute(
            select(func.count(Order.id)).where(Order.pharmacy_id == pharmacy_id)
        )).scalar_one()
        completed = (await self.db.execute(
            select(func.count(Order.id)).where(
                Order.pharmacy_id == pharmacy_id,
                Order.order_status == OrderStatus.COMPLETED,
            )
        )).scalar_one()
        net = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(RevenueRecord.pharmacy_id == pharmacy_id)
        )).scalar_one()
        available = (await self.db.execute(
            select(func.coalesce(func.sum(RevenueRecord.net_amount), 0.0))
            .where(
                RevenueRecord.pharmacy_id == pharmacy_id,
                RevenueRecord.status == RevenueStatus.AVAILABLE,
            )
        )).scalar_one()

        return {
            "total_orders": total_orders,
            "completed_orders": completed,
            "total_net_revenue": float(net),
            "available_balance": float(available),
        }
