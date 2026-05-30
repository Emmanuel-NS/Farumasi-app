"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, timeAgo } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, Clock, Check, X, Send, Image as ImageIcon,
  Wifi, Radio, Store, CheckCircle2, Eye, RefreshCw, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  prescriptionsService,
  type BackendPrescription,
} from "@/lib/services/prescriptions.service";

type FilterStatus = "all" | "draft" | "active" | "under_review" | "reviewed" | "fulfilled" | "cancelled" | "expired";

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all",           label: "All" },
  { value: "draft",         label: "Draft" },
  { value: "active",        label: "Active" },
  { value: "under_review",  label: "Under Review" },
  { value: "reviewed",      label: "Reviewed" },
  { value: "fulfilled",     label: "Fulfilled" },
  { value: "cancelled",     label: "Cancelled" },
];

const BROADCAST_STEPS = [
  { icon: Radio,        label: "Draft",        desc: "Request received from patient" },
  { icon: Wifi,         label: "Broadcasting", desc: "Sent to nearby pharmacies" },
  { icon: Store,        label: "Under Review", desc: "Pharmacist reviewing" },
  { icon: CheckCircle2, label: "Completed",    desc: "Prescription processed" },
];

function broadcastStep(status: string): number {
  if (status === "draft" || status === "active") return 1;
  if (status === "under_review") return 2;
  return 3;
}

function patientName(rx: BackendPrescription): string {
  return rx.patient?.user?.full_name ?? "Unknown Patient";
}
function patientPhone(rx: BackendPrescription): string {
  return rx.patient?.user?.phone ?? "—";
}
function totalAmount(rx: BackendPrescription): number {
  return rx.items.reduce((sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);
}

export default function RequestsPage() {
  const [filter, setFilter]               = useState<FilterStatus>("all");
  const [prescriptions, setPrescriptions] = useState<BackendPrescription[]>([]);
  const [loading, setLoading]             = useState(true);
  const [broadcastModal, setBroadcastModal] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { status: filter, limit: 50 } : { limit: 50 };
      const res = await prescriptionsService.getAll(params);
      setPrescriptions(res.items);
    } catch {
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const refreshOne = async (id: string) => {
    try {
      const updated = await prescriptionsService.getOne(id);
      setPrescriptions((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      // ignore — list refresh will catch up
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await prescriptionsService.submitReview({
        prescription_id: id,
        review_status: "clarification_needed",
        review_notes: "Marked under review by pharmacist.",
      });
      await refreshOne(id);
      toast.success("Marked under review");
    } catch { toast.error("Could not accept"); }
  };

  const handleReject = async (id: string) => {
    try {
      await prescriptionsService.submitReview({
        prescription_id: id,
        review_status: "rejected",
        review_notes: "Rejected by pharmacist.",
      });
      await refreshOne(id);
      toast.error("Prescription rejected");
    } catch { toast.error("Could not reject"); }
  };

  const handleReview = async (id: string) => {
    try {
      await prescriptionsService.submitReview({
        prescription_id: id,
        review_status: "approved",
        review_notes: "Approved by pharmacist.",
      });
      await refreshOne(id);
      toast.success("Prescription approved");
    } catch { toast.error("Could not update"); }
  };

  const broadcastCount = prescriptions.filter(
    (r) => r.status === "draft" || r.status === "active"
  ).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Requests</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review and respond to incoming requests</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

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
            {f.value === "all" && broadcastCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {broadcastCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-farumasi-200 border-t-farumasi-600 rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading prescriptions…</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <FileText className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No prescriptions found</p>
          <p className="text-slate-400 text-sm">Try a different filter or check back later</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const isNew = rx.status === "draft" || rx.status === "active";
            return (
              <div
                key={rx.id}
                className={cn(
                  "bg-white rounded-3xl border shadow-sm p-5 transition-all",
                  isNew
                    ? "border-amber-200 bg-amber-50/30"
                    : rx.status === "cancelled"
                    ? "border-red-100 opacity-70"
                    : "border-slate-100"
                )}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold text-slate-400">
                        #{rx.id.slice(-8).toUpperCase()}
                      </p>
                      {isNew && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                        {rx.prescription_type?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-900">{patientName(rx)}</p>
                    <p className="text-xs text-slate-500">{patientPhone(rx)}</p>
                  </div>
                  <StatusBadge status={rx.status} type="request" />
                </div>

                {rx.items.length > 0 ? (
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3">
                    {rx.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-0.5">
                        <span className="text-slate-700">
                          {item.medication_name}
                          {item.quantity != null && (
                            <span className="text-slate-400"> x{item.quantity}</span>
                          )}
                          {item.dosage && (
                            <span className="text-slate-400"> ({item.dosage})</span>
                          )}
                        </span>
                        {item.unit_price != null && (
                          <span className="text-slate-600">
                            {formatPrice((item.unit_price) * (item.quantity ?? 1))} RWF
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl px-4 py-3 mb-3 text-sm text-slate-400">
                    No items listed yet
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    {totalAmount(rx) > 0 && (
                      <div>
                        <p className="text-xs text-slate-400">Total</p>
                        <p className="text-sm font-extrabold text-farumasi-700">
                          {formatPrice(totalAmount(rx))} RWF
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{timeAgo(rx.created_at)}</span>
                </div>

                {rx.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 mb-3 italic">
                    {rx.notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href={`/requests/${rx.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-farumasi-200 text-farumasi-600 hover:bg-farumasi-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>

                  {rx.uploaded_file_url && (
                    <a
                      href={rx.uploaded_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Prescription
                    </a>
                  )}

                  {(isNew || rx.status === "under_review") && (
                    <button
                      onClick={() => setBroadcastModal(rx.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Network Status
                    </button>
                  )}

                  {isNew && (
                    <>
                      <button
                        onClick={() => handleAccept(rx.id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 transition-colors ml-auto"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleReject(rx.id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {rx.status === "under_review" && (
                    <button
                      onClick={() => handleReview(rx.id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 transition-colors ml-auto"
                    >
                      <Send className="w-3.5 h-3.5" /> Mark Reviewed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {broadcastModal && (() => {
        const rx = prescriptions.find((r) => r.id === broadcastModal);
        if (!rx) return null;
        const step = broadcastStep(rx.status);
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
              <p className="text-xs text-slate-500 mb-5">
                #{rx.id.slice(-8).toUpperCase()} — {patientName(rx)}
              </p>

              <div className="relative">
                {BROADCAST_STEPS.map((s, idx) => {
                  const isCompleted = idx < step;
                  const isActive    = idx === step;
                  const Icon        = s.icon;
                  return (
                    <div key={idx} className="flex items-start gap-3 mb-4 last:mb-0">
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
