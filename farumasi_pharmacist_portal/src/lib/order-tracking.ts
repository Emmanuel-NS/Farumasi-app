/** Map API order_status values to patient-style tracking step keys. */
export function normalizeTrackingStatus(status: string): string {
  const raw = (status || "pending").toLowerCase();
  const map: Record<string, string> = {
    pending: "pending_review",
    accepted: "pharmacy_accepted",
    preparing: "pharmacy_accepted",
    confirmed: "pharmacy_accepted",
    pharmacy_accepted: "pharmacy_accepted",
    ready_for_pickup: "ready_for_pickup",
    out_for_delivery: "out_for_delivery",
    delivered: "delivered",
    completed: "delivered",
  };
  return map[raw] ?? raw;
}

export const DELIVERY_TRACKING_STEPS = [
  { key: "pending_review", label: "Order placed", hint: "Waiting for partner pharmacy to confirm" },
  { key: "pharmacy_accepted", label: "Pharmacy confirmed", hint: "Partner is preparing the order" },
  { key: "ready_for_pickup", label: "Ready / packed", hint: "Items packed — awaiting pickup or rider" },
  { key: "out_for_delivery", label: "Out for delivery", hint: "Rider is heading to the patient" },
  { key: "delivered", label: "Delivered", hint: "Order completed" },
] as const;

export const PICKUP_TRACKING_STEPS = [
  { key: "pending_review", label: "Order placed", hint: "Waiting for partner pharmacy to confirm" },
  { key: "pharmacy_accepted", label: "Pharmacy confirmed", hint: "Partner is preparing the order" },
  { key: "ready_for_pickup", label: "Ready for pickup", hint: "Patient can collect at the pharmacy" },
  { key: "delivered", label: "Collected", hint: "Order completed" },
] as const;

export const TRACKING_STATUS_WEIGHTS: Record<string, number> = {
  pending_review: 0,
  pharmacy_accepted: 1,
  ready_for_pickup: 2,
  out_for_delivery: 3,
  delivered: 4,
};

export const CANCELLED_ORDER_STATUSES = new Set([
  "cancelled",
  "rejected",
  "failed",
]);

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending_assignment: "Waiting for rider assignment",
  assigned: "Rider assigned",
  accepted: "Rider accepted",
  going_to_pickup: "Rider heading to pharmacy",
  arrived_at_pickup: "Rider at pharmacy",
  picked_up: "Order picked up",
  out_for_delivery: "On the way to patient",
  arrived_at_destination: "Rider arrived",
  qr_pending: "Awaiting delivery QR scan",
  delivered: "Delivery completed",
  failed: "Delivery failed",
  cancelled: "Delivery cancelled",
};
