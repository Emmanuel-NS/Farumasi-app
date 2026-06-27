"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCountdown,
  isAwaitingPartnerConfirm,
  isReassignmentRisk,
  partnerResponseRemainingMs,
  PARTNER_RESPONSE_MINUTES,
} from "@/lib/order-sla";
import type { BackendOrder } from "@/lib/services/orders.service";

interface Props {
  order: BackendOrder;
  nowTick?: number;
  className?: string;
}

export function PartnerResponseSlaBanner({ order, nowTick = Date.now(), className }: Props) {
  if (!isAwaitingPartnerConfirm(order)) return null;

  const remaining = partnerResponseRemainingMs(order.partner_response_due_at, nowTick);
  const overdue = isReassignmentRisk({ ...order, now: nowTick });

  if (remaining == null && !overdue) {
    return (
      <div className={cn("rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", className)}>
        <p className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          Awaiting your confirmation
        </p>
        <p className="text-xs mt-1 text-amber-800">
          Confirm or reject within {PARTNER_RESPONSE_MINUTES} minutes of patient payment to avoid reassignment.
        </p>
      </div>
    );
  }

  if (overdue) {
    return (
      <div className={cn("rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900", className)}>
        <p className="font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Reassignment window open
        </p>
        <p className="text-xs mt-1 text-red-800">
          The patient may switch to another pharmacy. Accept and prepare this order now to keep it.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", className)}>
      <p className="font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4 shrink-0" />
        Confirm within {formatCountdown(remaining!)}
      </p>
      <p className="text-xs mt-1 text-amber-800">
        Patient paid — accept or reject before the timer ends or they can switch pharmacy.
      </p>
    </div>
  );
}
