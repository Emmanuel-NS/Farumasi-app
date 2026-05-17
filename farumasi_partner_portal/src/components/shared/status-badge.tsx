import { cn, orderStatusConfig, productStatusConfig, requestStatusConfig, withdrawalStatusConfig } from "@/lib/utils";
import type { OrderStatus, ProductStatus, RequestStatus, WithdrawalStatus } from "@/types";

type StatusType = OrderStatus | ProductStatus | RequestStatus | WithdrawalStatus;

interface StatusBadgeProps {
  status: StatusType;
  type: "order" | "product" | "request" | "withdrawal";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  let config: { label: string; color: string };
  if (type === "order") config = orderStatusConfig[status as OrderStatus];
  else if (type === "product") config = productStatusConfig[status as ProductStatus];
  else if (type === "request") config = requestStatusConfig[status as RequestStatus];
  else config = withdrawalStatusConfig[status as WithdrawalStatus];

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", config.color, className)}>
      {config.label}
    </span>
  );
}
