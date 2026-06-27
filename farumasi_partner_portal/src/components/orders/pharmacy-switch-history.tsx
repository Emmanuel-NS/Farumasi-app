"use client";

import { ArrowRightLeft, Building2, Clock, User } from "lucide-react";
import { formatDateTime, formatRWF } from "@/lib/utils";
import type {
  OrderActivityEntry,
  OrderPartnerAssignment,
} from "@/lib/services/orders.service";

function endReasonLabel(reason?: string | null): string | null {
  if (!reason) return null;
  const labels: Record<string, string> = {
    reassigned: "Patient switched pharmacy",
    completed: "Order completed",
    cancelled: "Order cancelled",
  };
  return labels[reason] ?? reason.replace(/_/g, " ");
}

function findSwitchActor(
  assignment: OrderPartnerAssignment,
  activity: OrderActivityEntry[],
): OrderActivityEntry | null {
  if (assignment.end_reason !== "reassigned" || !assignment.ended_at) return null;
  const endedMs = new Date(assignment.ended_at).getTime();
  const matches = activity.filter((e) => e.action === "order.pharmacy_reassigned");
  if (matches.length === 0) return null;

  let best: OrderActivityEntry | null = null;
  let bestDelta = Infinity;
  for (const entry of matches) {
    const delta = Math.abs(new Date(entry.created_at).getTime() - endedMs);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = entry;
    }
  }
  return bestDelta <= 5 * 60 * 1000 ? best : null;
}

interface Props {
  assignments: OrderPartnerAssignment[];
  activity: OrderActivityEntry[];
  reassignmentCount?: number;
  amountPaidSnapshot?: number | null;
}

export function PharmacySwitchHistory({
  assignments,
  activity,
  reassignmentCount = 0,
  amountPaidSnapshot,
}: Props) {
  const switches = assignments.filter((a) => a.end_reason === "reassigned");
  const hasHistory = assignments.length > 1 || switches.length > 0 || reassignmentCount > 0;

  if (!hasHistory) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-farumasi-600" />
          Partner assignment
        </h2>
        {assignments.length === 1 ? (
          <p className="text-sm text-muted-foreground">
            Assigned to{" "}
            <span className="font-semibold text-foreground">{assignments[0].provider_name}</span>{" "}
            since {formatDateTime(assignments[0].assigned_at)}. No switches yet.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No partner switches recorded for this order.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-farumasi-600" />
          Partner switch history
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {reassignmentCount > 0
            ? `${reassignmentCount} switch${reassignmentCount === 1 ? "" : "es"} by the patient`
            : `${switches.length} switch${switches.length === 1 ? "" : "es"} recorded`}
          {amountPaidSnapshot != null && <> · original payment {formatRWF(amountPaidSnapshot)}</>}
        </p>
      </div>

      <ul className="space-y-3">
        {assignments.map((row, index) => {
          const switchActor = findSwitchActor(row, activity);
          const audit = switchActor?.new_value as
            | {
                previous_provider_name?: string;
                new_provider_name?: string;
                new_total?: number;
                amount_paid?: number;
              }
            | undefined;
          const fromName = audit?.previous_provider_name ?? row.provider_name;
          const toAssignment = assignments[index + 1];
          const toName = audit?.new_provider_name ?? toAssignment?.provider_name;

          return (
            <li
              key={row.id}
              className={`rounded-xl border p-3 ${
                row.is_current
                  ? "border-farumasi-200 bg-farumasi-50/40"
                  : row.end_reason === "reassigned"
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-slate-100 bg-slate-50/50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-farumasi-600 shrink-0" />
                  <p className="text-sm font-bold truncate">{row.provider_name}</p>
                  {row.is_current && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-farumasi-100 text-farumasi-700">
                      Current
                    </span>
                  )}
                </div>
                {row.end_reason && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white border text-muted-foreground">
                    {endReasonLabel(row.end_reason)}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  Assigned {formatDateTime(row.assigned_at)}
                </p>
                {row.ended_at && (
                  <p className="flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    Ended {formatDateTime(row.ended_at)}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Quote: {formatRWF(row.subtotal)} subtotal · {formatRWF(row.net_partner_amount)} net
              </p>

              {row.end_reason === "reassigned" && toName && (
                <div className="mt-2 pt-2 border-t border-amber-200/80">
                  <p className="text-sm text-amber-900 font-semibold">
                    Switched from {fromName} → {toName}
                  </p>
                  {switchActor && (
                    <p className="text-xs text-amber-800/90 mt-1 flex items-center gap-1 flex-wrap">
                      <User className="w-3 h-3 shrink-0" />
                      {formatDateTime(switchActor.created_at)}
                      {switchActor.actor_name && (
                        <>
                          {" · "}
                          Initiated by {switchActor.actor_name}
                          {switchActor.actor_role === "patient" ? " (patient)" : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
