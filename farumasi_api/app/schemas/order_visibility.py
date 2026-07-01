"""Patient-facing order responses hide fulfilment secrets until fully paid."""

from __future__ import annotations

from app.models.order import Order
from app.schemas.order import OrderOut, OrderPartnerBrief, OrderPharmacyBrief
from app.services.payments.payment_helpers import order_payment_breakdown


def patient_fulfilment_unlocked(order: Order) -> bool:
    from app.core.constants import PaymentStatus

    if order.payment_status == PaymentStatus.PAID:
        return True
    return order_payment_breakdown(order)["fully_paid"]


def order_out_for_patient(order: Order) -> OrderOut:
    out = OrderOut.model_validate(order)
    if patient_fulfilment_unlocked(order):
        return out

    updates: dict = {
        "patient_access_code": None,
        "rider_access_code": None,
    }
    if out.pharmacy:
        updates["pharmacy"] = OrderPharmacyBrief(id=out.pharmacy.id, name=out.pharmacy.name)
    if out.partner_company:
        updates["partner_company"] = OrderPartnerBrief(
            id=out.partner_company.id,
            name=out.partner_company.name,
        )
    return out.model_copy(update=updates)
