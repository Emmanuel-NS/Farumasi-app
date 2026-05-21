"use client";

import { cn } from "@/lib/utils";
import { ORDER_STATUS_COLORS } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import type { OrderStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    pending:           t.status_pending,
    confirmed:         t.status_confirmed,
    preparing:         t.status_preparing,
    ready_for_pickup:  t.status_ready,
    out_for_delivery:  t.status_delivering,
    delivered:         t.status_delivered,
    cancelled:         t.status_cancelled,
    // legacy / extended statuses
    pending_review:    t.status_pending,
    finding_pharmacy:  t.status_pending,
    pharmacy_accepted: t.status_confirmed,
    payment_pending:   t.status_pending,
    driver_assigned:   t.status_delivering,
  };

  const label = STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const color = ORDER_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", color, className)}>
      {label}
    </span>
  );
}
