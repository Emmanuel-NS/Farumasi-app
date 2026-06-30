from pydantic import BaseModel, Field


class PaymentMethodBreakdown(BaseModel):
    method: str
    label: str
    count: int = 0
    amount: float = 0.0


class PaymentAnalyticsOut(BaseModel):
    total_collected: float = 0.0
    successful_count: int = 0
    awaiting_review_count: int = 0
    awaiting_review_amount: float = 0.0
    failed_count: int = 0
    by_method: list[PaymentMethodBreakdown] = Field(default_factory=list)


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
    total_collected: float = 0.0
    successful_payments: int = 0
    awaiting_review_payments: int = 0
    awaiting_review_amount: float = 0.0
    payments_by_method: list[PaymentMethodBreakdown] = Field(default_factory=list)
