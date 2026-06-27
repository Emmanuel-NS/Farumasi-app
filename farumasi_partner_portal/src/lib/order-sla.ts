/** Partner must confirm within this window after payment (matches backend). */
export const PARTNER_RESPONSE_MINUTES = 10;

export function parseApiDateTime(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function partnerResponseRemainingMs(dueAt?: string | null, now = Date.now()): number | null {
  const due = parseApiDateTime(dueAt);
  if (!due) return null;
  return due.getTime() - now;
}

export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function isAwaitingPartnerConfirm(order: {
  status?: string;
  order_status?: string;
  payment_status?: string;
  pharmacy_confirmed_at?: string | null;
}): boolean {
  const status = (order.status ?? order.order_status ?? "").toLowerCase();
  return (
    status === "pending" &&
    order.payment_status === "paid" &&
    !order.pharmacy_confirmed_at
  );
}

export function isReassignmentRisk(order: {
  status?: string;
  order_status?: string;
  payment_status?: string;
  pharmacy_confirmed_at?: string | null;
  partner_response_due_at?: string | null;
  now?: number;
}): boolean {
  if (!isAwaitingPartnerConfirm(order)) return false;
  const remaining = partnerResponseRemainingMs(
    order.partner_response_due_at,
    order.now ?? Date.now(),
  );
  return remaining != null && remaining <= 0;
}
