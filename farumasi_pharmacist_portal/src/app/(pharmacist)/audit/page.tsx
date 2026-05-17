"use client";

import { useState } from "react";
import { mockAuditLogs } from "@/data/mock";
import { timeAgo, formatDateTime, cn } from "@/lib/utils";
import { Shield } from "lucide-react";
import type { AuditAction } from "@/types";

const ACTION_COLORS: Record<AuditAction, string> = {
  request_accepted: "bg-green-100 text-green-700",
  request_rejected: "bg-red-100 text-red-700",
  invoice_sent: "bg-blue-100 text-blue-700",
  inventory_update: "bg-purple-100 text-purple-700",
  order_status_change: "bg-amber-100 text-amber-700",
  driver_assigned: "bg-sky-100 text-sky-700",
  login: "bg-slate-100 text-slate-700",
};

const ALL_ACTIONS: AuditAction[] = [
  "request_accepted", "request_rejected", "invoice_sent",
  "inventory_update", "order_status_change", "driver_assigned", "login"
];

export default function AuditPage() {
  const [filter, setFilter] = useState<"all" | AuditAction>("all");

  const filtered = filter === "all"
    ? mockAuditLogs
    : mockAuditLogs.filter((l) => l.action === filter);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track all activity in this pharmacy</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
            filter === "all" ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
          )}
        >
          All
        </button>
        {ALL_ACTIONS.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all capitalize",
              filter === a ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {a.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <Shield className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-4">
              <span className={cn("text-xs font-bold px-2 py-1 rounded-lg shrink-0 capitalize", ACTION_COLORS[log.action])}>
                {log.action.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{log.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">by {log.performedBy}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{timeAgo(log.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
