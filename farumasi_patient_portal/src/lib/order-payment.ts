import type { Order, OrderPaymentStatus } from "@/types";
import type { PaymentStatusResult } from "@/lib/services/payments.service";

const UNPAID_STATUSES = new Set<OrderPaymentStatus | string>([
  "pending",
  "unpaid",
  "failed",
  "partially_paid",
  "awaiting_review",
]);

export function orderNeedsPayment(order: Order): boolean {
  if (order.status === "cancelled") return false;
  const ps = order.paymentStatus ?? "unpaid";
  if (ps === "paid") return false;
  return UNPAID_STATUSES.has(ps);
}

export function orderTotalAmount(order: Order): number {
  const subtotal = Math.round(order.subtotal ?? order.pharmacyPrice ?? 0);
  const deliveryFee = Math.round(order.deliveryFee ?? 0);
  const fromFields = subtotal + deliveryFee;
  if (fromFields > 0) return fromFields;
  const digits = (order.total ?? "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function fallbackPaymentDetail(order: Order): PaymentStatusResult {
  const subtotal = Math.round(order.subtotal ?? order.pharmacyPrice ?? 0);
  const deliveryFee = Math.round(order.deliveryFee ?? 0);
  const total = orderTotalAmount(order);
  const paid = Math.round(order.amountPaidOrder ?? order.amountPaidSnapshot ?? 0);
  const balanceDue = Math.max(0, total - paid);
  const payable = balanceDue;
  const awaitingReview = order.paymentStatus === "awaiting_review";

  return {
    order_id: order.id,
    payment_status: order.paymentStatus ?? "unpaid",
    amount_due: payable,
    payable_balance: payable,
    balance_due: balanceDue,
    amount_paid_order: paid,
    amount_paid: paid > 0 ? paid : null,
    subtotal,
    delivery_fee: deliveryFee,
    total_amount: total,
    defer_delivery_fee: false,
    delivery_fee_outstanding: 0,
    medicines_paid: balanceDue <= 0 || (subtotal > 0 ? paid >= subtotal - 1 : paid > 0),
    fully_paid: balanceDue <= 0,
    can_submit_payment: balanceDue > 0 && !awaitingReview,
    awaiting_manual_review: awaitingReview,
    message:
      payable > 0
        ? `Pay ${payable.toLocaleString()} RWF to confirm your order.`
        : "Complete payment to place your order.",
  };
}

/** Remaining order balance (RWF) from list/summary fields — 0 when fully paid or cancelled. */
export function orderBalanceDue(order: Order): number {
  if (order.status === "cancelled") return 0;
  const detail = fallbackPaymentDetail(order);
  return detail.fully_paid ? 0 : Math.round(detail.balance_due ?? detail.payable_balance ?? 0);
}

export function resolvePaymentDetail(
  order: Order,
  paymentDetail: PaymentStatusResult | null,
): PaymentStatusResult | null {
  if (paymentDetail) return paymentDetail;
  if (!orderNeedsPayment(order)) return null;
  return fallbackPaymentDetail(order);
}

/** Best amount to show/charge now (payable first, then balance due). */
export function amountDueNow(detail: PaymentStatusResult | null, order?: Order): number {
  if (detail) {
    const payable = Math.round(detail.payable_balance ?? detail.amount_due ?? 0);
    if (payable > 0) return payable;
    const balance = Math.round(detail.balance_due ?? 0);
    if (balance > 0) return balance;
  }
  if (order) {
    const fb = fallbackPaymentDetail(order);
    const payable = Math.round(fb.payable_balance ?? fb.amount_due ?? 0);
    if (payable > 0) return payable;
    return Math.round(fb.balance_due ?? 0);
  }
  return 0;
}

export function patientFulfilmentUnlocked(
  order: Order,
  paymentDetail: PaymentStatusResult | null,
): boolean {
  const detail = resolvePaymentDetail(order, paymentDetail);
  return Boolean(detail?.fully_paid);
}

export function isOrderPaymentComplete(
  order: Order,
  paymentDetail: PaymentStatusResult | null,
): boolean {
  return patientFulfilmentUnlocked(order, paymentDetail);
}
