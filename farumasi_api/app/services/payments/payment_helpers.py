from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.order import Order


def amount_paid_on_order(order: Order) -> float:
    return round(float(getattr(order, "amount_paid_order", 0) or 0), 2)


def balance_due_for_order(order: Order, amount_paid: float | None = None) -> float:
    """Remaining order value the patient still owes (excludes processing fees)."""
    paid = round(float(amount_paid if amount_paid is not None else amount_paid_on_order(order)), 2)
    subtotal = round(float(order.subtotal or 0), 2)
    delivery = round(float(order.delivery_fee or 0), 2)
    total = round(float(order.total_amount or 0), 2)

    if bool(order.defer_delivery_fee) and delivery > 0:
        if paid < subtotal - 0.01:
            return round(max(0.0, subtotal - paid), 2)
        return round(max(0.0, delivery - max(0.0, paid - subtotal)), 2)
    return round(max(0.0, total - paid), 2)


def order_ready_for_fulfilment(order: Order, amount_paid: float | None = None) -> bool:
    """Partners may fulfil once medicines are paid; delivery fee may still be outstanding."""
    paid = round(float(amount_paid if amount_paid is not None else amount_paid_on_order(order)), 2)
    subtotal = round(float(order.subtotal or 0), 2)
    if bool(order.defer_delivery_fee) and float(order.delivery_fee or 0) > 0:
        return paid >= subtotal - 0.01
    return balance_due_for_order(order, paid) <= 0.01


def order_payment_breakdown(order: Order, amount_paid: float | None = None) -> dict:
    paid = round(float(amount_paid if amount_paid is not None else amount_paid_on_order(order)), 2)
    subtotal = round(float(order.subtotal or 0), 2)
    delivery = round(float(order.delivery_fee or 0), 2)
    total = round(float(order.total_amount or 0), 2)
    balance = balance_due_for_order(order, paid)
    delivery_outstanding = 0.0
    if bool(order.defer_delivery_fee) and delivery > 0 and paid >= subtotal - 0.01:
        delivery_outstanding = round(max(0.0, delivery - max(0.0, paid - subtotal)), 2)

    payable = balance
    if (
        bool(order.defer_delivery_fee)
        and delivery_outstanding > 0.01
        and paid >= subtotal - 0.01
        and balance <= delivery_outstanding + 0.01
    ):
        payable = 0.0

    return {
        "subtotal": subtotal,
        "delivery_fee": delivery,
        "total_amount": total,
        "defer_delivery_fee": bool(order.defer_delivery_fee),
        "amount_paid_order": paid,
        "balance_due": balance,
        "payable_balance": payable,
        "delivery_fee_outstanding": delivery_outstanding,
        "medicines_paid": paid >= subtotal - 0.01 if subtotal > 0 else paid > 0,
        "fully_paid": balance <= 0.01,
    }


def payable_balance_for_order(order: Order, amount_paid: float | None = None) -> float:
    """Amount the patient should still pay through the app (excludes delivery-on-arrival)."""
    return order_payment_breakdown(order, amount_paid)["payable_balance"]
