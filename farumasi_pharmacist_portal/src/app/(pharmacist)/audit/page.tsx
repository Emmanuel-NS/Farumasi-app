"use client";

import { useState } from "react";
import { mockAuditLogs } from "@/data/mock";
import { timeAgo, formatDateTime, cn } from "@/lib/utils";
import { Shield, Search, Download, X, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { AuditAction } from "@/types";

type AuditLog = (typeof mockAuditLogs)[number];

const ACTION_COLORS: Record<AuditAction, string> = {
  request_accepted:    "bg-green-100 text-green-700",
  request_rejected:    "bg-red-100 text-red-700",
  invoice_sent:        "bg-blue-100 text-blue-700",
  inventory_update:    "bg-purple-100 text-purple-700",
  order_status_change: "bg-amber-100 text-amber-700",
  driver_assigned:     "bg-sky-100 text-sky-700",
  login:               "bg-slate-100 text-slate-700",
};

const ALL_ACTIONS: AuditAction[] = [
  "request_accepted", "request_rejected", "invoice_sent",
  "inventory_update", "order_status_change", "driver_assigned", "login",
];

export default function AuditPage() {
  const [filter, setFilter]       = useState<"all" | AuditAction>("all");
  const [search, setSearch]       = useState("");
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  /* Fake blockchain hash per log id */
  const hashFor = (id: number) =>
    `0x${(id * 0xdeadbeef).toString(16).padStart(10, "0")}...f3a9`;

  const filtered = mockAuditLogs
    .filter((l) => filter === "all" || l.action === filter)
    .filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.description.toLowerCase().includes(q) ||
        (l.entityId ?? "").toLowerCase().includes(q)
      );
    });

  const handleExport = () => {
    const csv = [
      "ID,Action,Description,Performed By,Timestamp,Entity ID",
      ...filtered.map(
        (l) =>
          `${l.id},"${l.action}","${l.description}","${l.performedBy}","${l.timestamp}","${l.entityId ?? ""}"`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit logs exported");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track all activity in this pharmacy</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-farumasi-200 text-farumasi-700 hover:bg-farumasi-50 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Order ID or description…"
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all",
            filter === "all"
              ? "bg-farumasi-600 text-white border-farumasi-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
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
              filter === a
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
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
            <button
              key={log.id}
              onClick={() => setDetailLog(log)}
              className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-4 hover:shadow-md hover:border-farumasi-100 transition-all"
            >
              <span
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-lg shrink-0 capitalize",
                  ACTION_COLORS[log.action]
                )}
              >
                {log.action.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{log.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">by {log.performedBy}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">{timeAgo(log.timestamp)}</p>
                {log.entityId && (
                  <p className="text-[10px] text-farumasi-600 mt-0.5">{log.entityId}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Detail modal with blockchain disclaimer ─────── */}
      {detailLog && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailLog(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Log Detail</h3>
              <button onClick={() => setDetailLog(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action badge */}
            <span
              className={cn(
                "text-xs font-bold px-2.5 py-1 rounded-lg capitalize inline-block mb-3",
                ACTION_COLORS[detailLog.action]
              )}
            >
              {detailLog.action.replace(/_/g, " ")}
            </span>

            <div className="space-y-2 mb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Description</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{detailLog.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-0.5">Performed by</p>
                  <p className="text-xs font-semibold text-slate-700">{detailLog.performedBy}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase mb-0.5">Timestamp</p>
                  <p className="text-xs font-semibold text-slate-700">{timeAgo(detailLog.timestamp)}</p>
                </div>
              </div>
              {detailLog.entityId && (
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase mb-0.5">Entity ID</p>
                    <p className="text-xs font-semibold text-farumasi-700">{detailLog.entityId}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(detailLog.entityId ?? "");
                      toast.success("ID copied");
                    }}
                    className="text-slate-400 hover:text-farumasi-600"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Blockchain hash */}
            <div className="bg-slate-900 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Link2 className="w-3 h-3 text-farumasi-400" />
                <p className="text-[10px] font-bold text-farumasi-400 uppercase">Blockchain Hash</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-mono text-slate-300 break-all">{hashFor(detailLog.id)}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(hashFor(detailLog.id));
                    toast.success("Hash copied");
                  }}
                  className="text-slate-400 hover:text-white shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center leading-snug">
              This record is permanently recorded on the blockchain ledger and cannot be modified or deleted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


