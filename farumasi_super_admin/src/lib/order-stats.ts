import type { OrderAdminSummary } from "@/lib/services/admin-management.service";

export function rxSublabel(count?: number): string | undefined {
  if (!count) return undefined;
  return `${count} prescription order${count === 1 ? "" : "s"}`;
}

export function orderStatSublabels(summary: OrderAdminSummary | null) {
  if (!summary) return {};
  return {
    total: rxSublabel(summary.prescription_orders),
    pending: rxSublabel(summary.prescription_pending),
    inProgress: rxSublabel(summary.prescription_in_progress),
    completed: rxSublabel(summary.prescription_completed),
    cancelled: rxSublabel(summary.prescription_cancelled),
  };
}
