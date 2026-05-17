"use client";

import { useState } from "react";
import Link from "next/link";
import { mockRequests } from "@/data/mock";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDate, timeAgo } from "@/lib/utils";
import { FileText, Clock, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/types";

const STATUS_FILTERS: { value: "all" | RequestStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "broadcast", label: "Broadcast" },
  { value: "accepted", label: "Accepted" },
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "patient_confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
];

export default function RequestsPage() {
  const [filter, setFilter] = useState<"all" | RequestStatus>("all");

  const filtered = filter === "all"
    ? mockRequests
    : mockRequests.filter((r) => r.status === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prescription Requests</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and respond to incoming requests</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              filter === f.value
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {f.label}
            {f.value === "broadcast" && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                {mockRequests.filter(r => r.status === "broadcast").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <FileText className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <Link key={req.id} href={`/requests/${req.id}`}>
              <div className={cn(
                "bg-white rounded-3xl border shadow-sm p-5 hover:shadow-md transition-all group",
                req.status === "broadcast" ? "border-amber-200 bg-amber-50/30" : "border-slate-100"
              )}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-400">#{req.id}</p>
                      {req.status === "broadcast" && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-900">{req.patientName}</p>
                    <p className="text-xs text-slate-500">{req.patientPhone}</p>
                  </div>
                  <StatusBadge status={req.status} type="request" />
                </div>

                {/* Items */}
                <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3">
                  {req.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-slate-700">{item.name} <span className="text-slate-400">×{item.quantity}</span></span>
                      <span className="text-slate-600">{formatPrice(item.unitPrice * item.quantity)} RWF</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-extrabold text-farumasi-700">{formatPrice(req.totalAmount)} RWF</p>
                    </div>
                    {req.status === "broadcast" && (
                      <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Expires {timeAgo(req.expiresAt)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(req.broadcastAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
