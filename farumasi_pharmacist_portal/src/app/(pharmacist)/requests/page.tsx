"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, timeAgo, cn } from "@/lib/utils";
import Link from "next/link";
import {
  FileText, Check, X, Image as ImageIcon, RefreshCw,
  ChevronRight, Pill, ExternalLink, AlertTriangle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { prescriptionsService, type BackendPrescription } from "@/lib/services/prescriptions.service";
import { mediaUrl } from "@/lib/api";

// "cancelled" and "expired" are pulled into their own tab.
const CANCELLED_RX_STATUSES = new Set(["cancelled", "expired"]);

type FilterStatus = "all" | "draft" | "active" | "under_review" | "reviewed" | "fulfilled";

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "active",       label: "New" },
  { value: "under_review", label: "Under Review" },
  { value: "reviewed",     label: "Cart Sent" },
  { value: "fulfilled",    label: "Fulfilled" },
];

const STATUS_COLOR: Record<string, string> = {
  draft:        "text-slate-500 bg-slate-100",
  active:       "text-amber-700 bg-amber-100",
  under_review: "text-blue-700 bg-blue-100",
  reviewed:     "text-farumasi-700 bg-farumasi-100",
  fulfilled:    "text-green-700 bg-green-100",
  cancelled:    "text-red-600 bg-red-100",
  expired:      "text-slate-400 bg-slate-100",
};

function patientName(rx: BackendPrescription): string {
  return rx.patient?.user?.full_name ?? "Unknown Patient";
}
function patientPhone(rx: BackendPrescription): string {
  return rx.patient?.user?.phone ?? "—";
}

export default function RequestsPage() {
  const [mainTab, setMainTab]             = useState<"active" | "cancelled">("active");
  const [filter, setFilter]               = useState<FilterStatus>("all");
  const [prescriptions, setPrescriptions] = useState<BackendPrescription[]>([]);
  const [loading, setLoading]             = useState(true);
  const [acting, setActing]               = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Always load all — split in-memory across tabs.
      const res = await prescriptionsService.getAll({ limit: 100 });
      setPrescriptions(res.items);
    } catch {
      toast.error("Failed to load prescriptions");
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const refreshOne = async (id: string) => {
    try {
      const updated = await prescriptionsService.getOne(id);
      setPrescriptions((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch { /* ignore */ }
  };

  const handleAction = async (id: string, reviewStatus: "clarification_needed" | "rejected" | "approved") => {
    setActing(id);
    try {
      await prescriptionsService.submitReview({ prescription_id: id, review_status: reviewStatus });
      await refreshOne(id);
      toast.success(reviewStatus === "rejected" ? "Prescription rejected" : reviewStatus === "approved" ? "Prescription approved" : "Marked under review");
    } catch {
      toast.error("Could not update prescription");
    } finally { setActing(null); }
  };

  const activeRxs    = prescriptions.filter((r) => !CANCELLED_RX_STATUSES.has(r.status));
  const cancelledRxs = prescriptions.filter((r) => CANCELLED_RX_STATUSES.has(r.status));

  const filteredActive = filter === "all"
    ? activeRxs
    : activeRxs.filter((r) => r.status === filter);

  const displayRxs  = mainTab === "cancelled" ? cancelledRxs : filteredActive;
  const newCount    = activeRxs.filter((r) => r.status === "draft" || r.status === "active").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Requests</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review patient prescriptions and uploaded documents</p>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full animate-pulse">
              {newCount} new
            </span>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main tab row */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit mb-5">
        {([
          { key: "active",    label: "Requests",   count: activeRxs.length    },
          { key: "cancelled", label: "Cancelled",  count: cancelledRxs.length },
        ] as const).map(({ key, label, count }) => (
          <button key={key} onClick={() => setMainTab(key)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
              mainTab === key ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}>
            {label}
            {count > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                mainTab === key
                  ? key === "cancelled" ? "bg-red-600 text-white" : "bg-farumasi-600 text-white"
                  : "bg-slate-200 text-slate-500"
              )}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Status filters (only on active tab) */}
      <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5", mainTab === "cancelled" && "hidden")}>
        {STATUS_FILTERS.map((f) => {
          const count = f.value === "all" ? activeRxs.length
            : activeRxs.filter((r) => r.status === f.value || (f.value === "active" && r.status === "draft")).length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border flex items-center gap-1.5",
                filter === f.value
                  ? "bg-farumasi-600 text-white border-farumasi-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
              )}>
              {f.label}
              {count > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  filter === f.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-farumasi-600 animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading prescriptions…</p>
        </div>
      ) : displayRxs.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <FileText className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">
            {mainTab === "cancelled" ? "No cancelled prescriptions" : "No prescriptions found"}
          </p>
          <p className="text-slate-400 text-sm">Try a different filter or check back later</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRxs.map((rx) => {
            const isNew         = rx.status === "draft" || rx.status === "active";
            const isUnderReview = rx.status === "under_review";
            const isActing      = acting === rx.id;
            const isUploaded    = rx.prescription_type === "uploaded" || !!rx.uploaded_file_url;
            const isPdf         = rx.uploaded_file_url?.toLowerCase().includes(".pdf");
            const statusClass   = STATUS_COLOR[rx.status] ?? "text-slate-500 bg-slate-100";
            const totalAmount   = rx.items.reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);

            return (
              <div key={rx.id} className={cn(
                "bg-white rounded-3xl border shadow-sm overflow-hidden transition-all",
                isNew ? "border-amber-200" : rx.status === "cancelled" ? "border-red-100" : "border-slate-100"
              )}>
                <div className="p-5">
                  {/* ── Header row ── */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Prescription image thumbnail */}
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                      {isUploaded && rx.uploaded_file_url && !isPdf ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(rx.uploaded_file_url)} alt="Prescription" className="w-full h-full object-cover" />
                      ) : isUploaded && isPdf ? (
                        <FileText className="w-6 h-6 text-red-400" />
                      ) : (
                        <FileText className="w-6 h-6 text-farumasi-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-xs font-bold text-slate-400">#{rx.id.slice(-8).toUpperCase()}</p>
                        {isNew && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                            NEW
                          </span>
                        )}
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", statusClass)}>
                          {rx.status.replace(/_/g, " ")}
                        </span>
                        {isUploaded && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {isPdf ? "PDF" : "Image"}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold text-slate-900 truncate">{patientName(rx)}</p>
                      <p className="text-xs text-slate-500">{patientPhone(rx)} · {timeAgo(rx.created_at)}</p>
                    </div>
                  </div>

                  {/* ── Inline image preview for uploaded prescriptions ── */}
                  {isUploaded && rx.uploaded_file_url && (
                    <div className="mb-3">
                      {!isPdf ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl(rx.uploaded_file_url)}
                            alt="Prescription image"
                            className="w-full max-h-40 object-contain"
                          />
                          <a
                            href={mediaUrl(rx.uploaded_file_url)}
                            target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center hover:bg-white shadow transition-colors"
                            title="Open full image"
                          >
                            <ExternalLink className="w-3 h-3 text-farumasi-600" />
                          </a>
                        </div>
                      ) : (
                        <a
                          href={mediaUrl(rx.uploaded_file_url)}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5 hover:bg-red-100 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="flex-1 text-xs font-semibold text-red-700 truncate">
                            {rx.uploaded_file_url.split("/").pop() ?? "PDF Document"}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* ── Items list ── */}
                  {rx.items.length > 0 ? (
                    <div className="bg-slate-50 rounded-2xl px-3 py-2 mb-3">
                      {rx.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs py-0.5 gap-2">
                          <span className="text-slate-700 flex items-center gap-1">
                            <Pill className="w-3 h-3 text-farumasi-400 shrink-0" />
                            <span className="truncate">{item.medicine_name}</span>
                            {item.dosage && <span className="text-slate-400">({item.dosage})</span>}
                            {item.quantity != null && <span className="text-slate-400">×{item.quantity}</span>}
                          </span>
                          {item.unit_price != null && (
                            <span className="text-slate-600 shrink-0">
                              {formatPrice(item.unit_price * (item.quantity ?? 1))} RWF
                            </span>
                          )}
                        </div>
                      ))}
                      {totalAmount > 0 && (
                        <div className="border-t border-slate-200 mt-1.5 pt-1.5 flex justify-between">
                          <span className="text-xs font-bold text-slate-500">Total</span>
                          <span className="text-xs font-extrabold text-farumasi-700">{formatPrice(totalAmount)} RWF</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl px-3 py-2 mb-3 text-xs text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      No items listed — review image to extract medicines
                    </div>
                  )}

                  {/* ── Notes ── */}
                  {rx.notes && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl px-3 py-2 mb-3">{rx.notes}</p>
                  )}

                  {/* ── Action row ── */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-slate-100 pt-3">
                    <Link href={`/requests/${rx.id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-farumasi-200 text-farumasi-600 hover:bg-farumasi-50 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                      Full Details
                    </Link>

                    {isNew && (
                      <>
                        <button onClick={() => handleAction(rx.id, "rejected")} disabled={isActing}
                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto">
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Reject
                        </button>
                        <button onClick={() => handleAction(rx.id, "clarification_needed")} disabled={isActing}
                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:opacity-50 transition-colors">
                          {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Accept
                        </button>
                      </>
                    )}

                    {isUnderReview && (
                      <button onClick={() => handleAction(rx.id, "approved")} disabled={isActing}
                        className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:opacity-50 transition-colors ml-auto">
                        {isActing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
