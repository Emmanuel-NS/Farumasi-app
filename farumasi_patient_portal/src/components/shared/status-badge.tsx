import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";
import type { OrderStatus } from "@/types";

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const color = ORDER_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", color, className)}>
      {label}
    </span>
  );
}
