from pydantic import BaseModel


class AdminSummaryOut(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_pharmacies: int
    total_riders: int
    total_orders: int
    completed_orders: int
    total_prescriptions: int
    available_revenue_net: float
    pending_withdrawals: int
