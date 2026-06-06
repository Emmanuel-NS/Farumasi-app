import { cn, orderStatusConfig, productStatusConfig, requestStatusConfig, withdrawalStatusConfig } from "@/lib/utils";
import { settlementStatusConfig } from "@/lib/revenue-utils";
import type { OrderStatus, ProductStatus, RequestStatus, WithdrawalStatus } from "@/types";

type StatusType = OrderStatus | ProductStatus | RequestStatus | WithdrawalStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  type: "order" | "product" | "request" | "withdrawal" | "settlement";
  className?: string;
}

const FALLBACK_CONFIG = { label: "Unknown", color: "bg-gray-100 text-gray-500 border-gray-200" };

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const safeStatus = (status ?? "") as string;
  let config: { label: string; color: string };
  if (type === "order") config = orderStatusConfig[safeStatus as OrderStatus] ?? { label: safeStatus.replace(/_/g, " ") || "Unknown", color: "bg-gray-100 text-gray-500 border-gray-200" };
  else if (type === "product") config = productStatusConfig[safeStatus as ProductStatus] ?? FALLBACK_CONFIG;
  else if (type === "request") config = requestStatusConfig[safeStatus as RequestStatus] ?? FALLBACK_CONFIG;
  else if (type === "settlement") config = settlementStatusConfig[safeStatus] ?? FALLBACK_CONFIG;
  else config = withdrawalStatusConfig[safeStatus as WithdrawalStatus] ?? FALLBACK_CONFIG;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", config.color, className)}>
      {config.label}
    </span>
  );
}
