"use client";

import { useState } from "react";
import { mockRequests } from "@/data/mock";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, timeAgo } from "@/lib/utils";
import {
  FileText, Clock, Check, X, Send, Image as ImageIcon,
  Wifi, Radio, Store, CheckCircle2, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RequestStatus } from "@/types";

type Request = (typeof mockRequests)[number];

const STATUS_FILTERS: { value: "all" | RequestStatus; label: string }[] = [
  { value: "all",              label: "All" },
  { value: "broadcast",        label: "Broadcast" },
  { value: "accepted",         label: "Accepted" },
  { value: "invoice_sent",     label: "Invoice Sent" },
  { value: "patient_confirmed",label: "Confirmed" },
  { value: "rejected",         label: "Rejected" },
];

/* Broadcast monitoring steps */
const BROADCAST_STEPS = [
  { icon: Radio,          label: "Draft",                    desc: "Request received from patient" },
  { icon: Wifi,           label: "Broadcasting",             desc: "Sent to nearby pharmacies" },
  { icon: Store,          label: "Monitoring Pharmacies",    desc: "Waiting for acceptance" },
  { icon: CheckCircle2,   label: "Completed",                desc: "Pharmacy accepted request" },
];

export default function RequestsPage() {
  const [filter, setFilter]         = useState<"all" | RequestStatus>("all");
  const [statuses, setStatuses]     = useState<Record<string, RequestStatus>>({});
  const [imageModal, setImageModal] = useState<string | null>(null); // req id
  const [broadcastModal, setBroadcastModal] = useState<string | null>(null);

  const getStatus = (req: Request): RequestStatus =>
    statuses[req.id] ?? req.status;

  const filtered =
    filter === "all"
      ? mockRequests
      : mockRequests.filter((r) => getStatus(r) === filter);

  const handleAccept = (id: string) => {
    setStatuses((p) => ({ ...p, [id]: "accepted" }));
    toast.success("Request accepted");
  };
  const handleReject = (id: string) => {
    setStatuses((p) => ({ ...p, [id]: "rejected" }));
    toast.error("Request rejected");
  };
  const handleInvoice = (id: string) => {
    setStatuses((p) => ({ ...p, [id]: "invoice_sent" }));
    toast.success("Invoice sent to patient");
  };

  /* Which broadcast step is active (simulate based on status) */
  const broadcastStep = (req: Request): number => {
    const s = getStatus(req);
    if (s === "broadcast") return 1;
    if (s === "accepted")  return 3;
    return 3;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Prescription Requests</h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and respond to incoming requests</p>
      </div>

      {/* Filter chips */}
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
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {mockRequests.filter((r) => getStatus(r) === "broadcast").length}
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
          {filtered.map((req) => {
            const status = getStatus(req);
            return (
              <div
                key={req.id}
                className={cn(
                  "bg-white rounded-3xl border shadow-sm p-5 transition-all",
                  status === "broadcast"
                    ? "border-amber-200 bg-amber-50/30"
                    : status === "rejected"
                    ? "border-red-100 opacity-70"
                    : "border-slate-100"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-400">#{req.id}</p>
                      {status === "broadcast" && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-900">{req.patientName}</p>
                    <p className="text-xs text-slate-500">{req.patientPhone}</p>
                  </div>
                  <StatusBadge status={status} type="request" />
                </div>

                {/* Items */}
                <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3">
                  {req.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-slate-700">
                        {item.name} <span className="text-slate-400">×{item.quantity}</span>
                      </span>
                      <span className="text-slate-600">{formatPrice(item.unitPrice * item.quantity)} RWF</span>
                    </div>
                  ))}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="text-sm font-extrabold text-farumasi-700">{formatPrice(req.totalAmount)} RWF</p>
                    </div>
                    {status === "broadcast" && (
                      <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" />
                        Expires {timeAgo(req.expiresAt)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(req.broadcastAt)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {/* View prescription image */}
                  <button
                    onClick={() => setImageModal(req.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Prescription
                  </button>

                  {/* Broadcast monitoring */}
                  {(status === "broadcast" || status === "accepted") && (
                    <button
                      onClick={() => setBroadcastModal(req.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Network Status
                    </button>
                  )}

                  {/* Contextual primary actions */}
                  {status === "broadcast" && (
                    <>
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 transition-colors ml-auto"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {status === "accepted" && (
                    <button
                      onClick={() => handleInvoice(req.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 transition-colors ml-auto"
                    >
                      <Send className="w-3.5 h-3.5" /> Send Invoice
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Prescription image viewer modal ──────────────── */}
      {imageModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Prescription</h3>
              <button onClick={() => setImageModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Placeholder image — real app would load from backend */}
            <div className="w-full h-56 rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
              <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm text-slate-400 font-medium">
                {mockRequests.find((r) => r.id === imageModal)?.patientName}
              </p>
              <p className="text-xs text-slate-400">#{imageModal}</p>
            </div>
            <p className="text-[11px] text-center text-slate-400 mt-3">
              Prescription image uploaded by patient
            </p>
          </div>
        </div>
      )}

      {/* ── Network broadcast monitoring modal ───────────── */}
      {broadcastModal && (() => {
        const req = mockRequests.find((r) => r.id === broadcastModal)!;
        const step = broadcastStep(req);
        return (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setBroadcastModal(null)}
          >
            <div
              className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Network Status</h3>
                <button onClick={() => setBroadcastModal(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-5">Request #{broadcastModal} — {req.patientName}</p>

              {/* Step indicators */}
              <div className="relative">
                {BROADCAST_STEPS.map((s, idx) => {
                  const isCompleted = idx < step;
                  const isActive    = idx === step;
                  const Icon        = s.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 mb-4 last:mb-0">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isCompleted ? "bg-farumasi-600 text-white"
                            : isActive ? "bg-amber-100 border-2 border-amber-400 text-amber-600"
                            : "bg-slate-100 text-slate-300"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {idx < BROADCAST_STEPS.length - 1 && (
                          <div className={cn("w-0.5 h-6 mt-1", isCompleted ? "bg-farumasi-300" : "bg-slate-100")} />
                        )}
                      </div>
                      <div className="pt-1">
                        <p className={cn(
                          "text-sm font-semibold",
                          isActive ? "text-amber-700" : isCompleted ? "text-farumasi-700" : "text-slate-400"
                        )}>
                          {s.label}
                          {isActive && <span className="ml-2 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full animate-pulse">In Progress</span>}
                          {isCompleted && <span className="ml-2 text-[10px] bg-farumasi-100 text-farumasi-600 px-1.5 py-0.5 rounded-full">Done</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
