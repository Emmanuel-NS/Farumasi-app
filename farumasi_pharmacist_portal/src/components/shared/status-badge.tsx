import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "request";
  className?: string;
}

export function StatusBadge({ status, type = "order", className }: StatusBadgeProps) {
  const label = type === "request"
    ? (REQUEST_STATUS_LABELS[status] ?? status)
    : (ORDER_STATUS_LABELS[status] ?? status);
  const color = type === "request"
    ? (REQUEST_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-500")
    : (ORDER_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-500");

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", color, className)}>
      {label}
    </span>
  );
}
