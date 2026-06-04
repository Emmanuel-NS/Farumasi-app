"use client";

import { Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { OrderActivityEntry } from "@/lib/services/orders.service";

function describeEntry(entry: OrderActivityEntry): string {
  const action = entry.action.replace(/\./g, " · ");
  if (entry.action === "order.status_changed" && entry.new_value && typeof entry.new_value === "object") {
    const status = (entry.new_value as { status?: string }).status;
    const old = entry.old_value && typeof entry.old_value === "object"
      ? (entry.old_value as { status?: string }).status
      : null;
    if (status) {
      return old
        ? `Status changed from ${old.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}`
        : `Status set to ${status.replace(/_/g, " ")}`;
    }
  }
  return action.replace(/_/g, " ");
}

export function OrderActivityTimeline({ entries }: { entries: OrderActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">No activity recorded for this order yet.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, i) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-farumasi-600 mt-1.5" />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-slate-200 min-h-[2rem]" />}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-sm font-semibold text-slate-800 capitalize">
              {describeEntry(entry)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime(entry.created_at)}
              {entry.actor_name && (
                <span>
                  {" · "}
                  {entry.actor_name}
                  {entry.actor_role ? ` (${entry.actor_role.replace(/_/g, " ")})` : ""}
                </span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
