"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import {
  Upload, Camera, FileText, CheckCircle, X, AlertCircle,
  XCircle, Package, Pill, Plus, CalendarDays,
  Image as ImageIcon, ExternalLink, RefreshCw, AlertTriangle,
  ShoppingCart, Send, ChevronRight, Archive,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { GuestGate } from "@/components/shared/guest-gate";
import { PinGate } from "@/components/shared/pin-gate";
import {
  prescriptionsService,
  adaptPrescription,
  type BackendPrescription,
} from "@/lib/services/prescriptions.service";
import { ordersService } from "@/lib/services/orders.service";
import { apiErrorDetail, mediaUrl } from "@/lib/api";
import type { DigitalPrescription, DigitalPrescriptionStatus } from "@/types";

type Tab = "active" | "cancelled" | "upload";
type UploadState = "idle" | "preview" | "success";

interface UploadedFile {
  name: string; size: number; type: string; preview: string | null;
}

/** Camera captures often ship without a useful name or MIME type. */
function normalizeCaptureFile(file: File): File {
  const type = file.type || "image/jpeg";
  const ext =
    type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : type === "image/heic" || type === "image/heif"
          ? "heic"
          : "jpg";
  const hasExt = /\.[a-z0-9]+$/i.test(file.name);
  const name =
    file.name && file.name !== "image" && hasExt
      ? file.name
      : `prescription-${Date.now()}.${ext}`;
  if (file.name === name && file.type === type) return file;
  return new File([file], name, { type, lastModified: file.lastModified });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function decodeSellMode(instructions: string | null | undefined): "pack" | "partial" {
  return instructions?.startsWith("[sm:partial]") ? "partial" : "pack";
}
function decodeInstructions(instructions: string | null | undefined): string {
  return (instructions ?? "").replace(/^\[sm:(pack|partial)\]\s*/, "");
}

const STATUS_META: Record<DigitalPrescriptionStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  draft:               { label: "Draft",          color: "text-slate-600",    bg: "bg-slate-50",    border: "border-slate-200",   icon: FileText },
  active:              { label: "Under Review",    color: "text-blue-700",     bg: "bg-blue-50",     border: "border-blue-100",    icon: AlertCircle },
  sent_to_patient:     { label: "Cart Ready",      color: "text-farumasi-700", bg: "bg-farumasi-50", border: "border-farumasi-100", icon: ShoppingCart },
  patient_viewing:     { label: "Cart Ready",      color: "text-farumasi-700", bg: "bg-farumasi-50", border: "border-farumasi-100", icon: ShoppingCart },
  order_placed:        { label: "Order Placed",    color: "text-purple-700",   bg: "bg-purple-50",   border: "border-purple-100",  icon: Package },
  partially_fulfilled: { label: "Partly Filled",   color: "text-orange-700",   bg: "bg-orange-50",   border: "border-orange-100",  icon: AlertCircle },
  fulfilled:           { label: "Fulfilled",       color: "text-green-700",    bg: "bg-green-50",    border: "border-green-100",   icon: CheckCircle },
  expired:             { label: "Expired",         color: "text-red-700",      bg: "bg-red-50",      border: "border-red-100",     icon: XCircle },
  cancelled:           { label: "Cancelled",       color: "text-slate-500",    bg: "bg-slate-50",    border: "border-slate-100",   icon: X },
};

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading prescriptions…</div>}>
      <PrescriptionsPageContent />
    </Suspense>
  );
}

function PrescriptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab]             = useState<Tab>("active");
  const [rawList, setRawList]     = useState<BackendPrescription[]>([]);
  const [rxOrderMap, setRxOrderMap] = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling]     = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const loadPrescriptions = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const [raw, ordersPage] = await Promise.all([
        prescriptionsService.getMyPrescriptionsRaw(),
        ordersService.getMyOrders(0, 100).catch(() => ({ items: [], total: 0, offset: 0, limit: 0 })),
      ]);
      const byRx: Record<string, string> = {};
      for (const o of ordersPage.items) {
        const pid = (o as { prescription_id?: string }).prescription_id;
        if (pid && !byRx[pid]) byRx[pid] = o.id;
      }
      setRawList(raw);
      setRxOrderMap(byRx);
    } catch { /* no-op */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested === "upload" || requested === "cancelled" || requested === "active") {
      setTab(requested);
    }
  }, [searchParams]);

  useEffect(() => { loadPrescriptions(); }, [loadPrescriptions]);

  const prescriptions = rawList.map((p) => ({
    ...adaptPrescription(p),
    orderId: rxOrderMap[p.id],
  }));
  const active     = prescriptions.filter((rx) => rx.status !== "cancelled" && rx.status !== "expired");
  const cancelled  = prescriptions.filter((rx) => rx.status === "cancelled" || rx.status === "expired");

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await prescriptionsService.cancelPrescription(cancelTarget);
      await loadPrescriptions(true);
    } catch { alert("Could not cancel this prescription."); }
    finally { setCancelling(false); setCancelTarget(null); }
  };

  return (
    <GuestGate feature="prescriptions">
      <PinGate feature="prescriptions">
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
              <p className="text-slate-500 text-sm mt-0.5">Upload and manage your prescriptions</p>
            </div>
            <button onClick={() => loadPrescriptions(true)} disabled={refreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-farumasi-600 hover:bg-farumasi-50 transition-colors">
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 w-fit">
            {([
              { key: "active",    label: "My Prescriptions", count: active.length },
              { key: "cancelled", label: "Cancelled",        count: cancelled.length },
              { key: "upload",    label: "Upload New",       count: 0 },
            ] as const).map(({ key, label, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all",
                  tab === key ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}>
                {key === "upload" ? <Upload className="w-4 h-4" /> : key === "cancelled" ? <XCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                {label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    tab === key ? "bg-farumasi-600 text-white" : "bg-slate-200 text-slate-500"
                  )}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-100 p-5 animate-pulse">
                  <div className="h-4 w-1/3 bg-slate-100 rounded mb-3" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : tab === "upload" ? (
            <UploadPrescription onSuccess={() => { loadPrescriptions(true); setTab("active"); }} />
          ) : tab === "cancelled" ? (
            <CancelledList prescriptions={cancelled} onUpload={() => setTab("upload")} />
          ) : (
            <ActiveList
              prescriptions={active}
              rawList={rawList}
              expandedId={expandedId}
              onExpand={(rxId) => setExpandedId(expandedId === rxId ? null : rxId)}
              onUpload={() => setTab("upload")}
              onRequestCancel={(rxId) => setCancelTarget(rxId)}
              onConfirmOrder={(rxId) => router.push(`/cart?rx=${rxId}`)}
            />
          )}
        </div>

        {/* Cancel modal */}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !cancelling && setCancelTarget(null)} />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Cancel this prescription?</p>
                  <p className="text-xs text-slate-500 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCancelTarget(null)} disabled={cancelling}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">
                  Keep
                </button>
                <button onClick={confirmCancel} disabled={cancelling}
                  className="flex-1 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {cancelling ? "Cancelling…" : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

      </PinGate>
    </GuestGate>
  );
}

// ── Active Prescriptions List ────────────────────────────────────────────────

function ActiveList({
  prescriptions, rawList, expandedId, onExpand, onUpload, onRequestCancel, onConfirmOrder,
}: {
  prescriptions: DigitalPrescription[];
  rawList: BackendPrescription[];
  expandedId: string | null;
  onExpand: (id: string) => void;
  onUpload: () => void;
  onRequestCancel: (id: string) => void;
  onConfirmOrder: (id: string) => void;
}) {
  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No prescriptions yet</h3>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Upload a prescription and our pharmacist will prepare your medicines.
        </p>
        <button onClick={onUpload}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-farumasi-600 border border-farumasi-200 px-4 py-2.5 rounded-2xl hover:bg-farumasi-50 transition-colors">
          <Plus className="w-4 h-4" />
          Upload a Prescription
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((rx) => {
        const raw        = rawList.find((r) => r.id === rx.id);
        const meta       = STATUS_META[rx.status] ?? STATUS_META.active;
        const StatusIcon = meta.icon;
        const isUploaded = rx.prescriptionType === "uploaded" || !!rx.uploadedFileUrl;
        const isPdf      = rx.uploadedFileUrl?.toLowerCase().includes(".pdf");
        const expanded   = expandedId === rx.id;
        const canCancel  = ["active", "draft"].includes(rx.status);
        const isCartReady = rx.status === "sent_to_patient" || rx.status === "patient_viewing";
        const rawItems   = raw?.items ?? [];

        return (
          <div key={rx.id} className={cn(
            "bg-white rounded-3xl border shadow-sm overflow-hidden",
            isCartReady ? "border-farumasi-300 ring-1 ring-farumasi-200" : "border-slate-100"
          )}>
            {/* Cart-ready banner */}
            {isCartReady && (
              <div className="bg-farumasi-600 px-4 py-2.5 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-white" />
                <p className="text-sm font-bold text-white flex-1">Your cart is ready — confirm to place order</p>
              </div>
            )}

            {/* Card header */}
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {isUploaded && rx.uploadedFileUrl && !isPdf
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={mediaUrl(rx.uploadedFileUrl)} alt="Prescription" className="w-full h-full object-cover" />
                      : isUploaded && isPdf
                      ? <FileText className="w-6 h-6 text-red-400" />
                      : <Pill className="w-6 h-6 text-farumasi-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {isUploaded ? "Uploaded Prescription" : "Prescription"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {relativeDate(rx.issuedAt)}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0",
                  meta.bg, meta.color, meta.border
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Uploaded image preview */}
            {isUploaded && rx.uploadedFileUrl && (
              <div className="px-4 pb-3">
                {!isPdf ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(rx.uploadedFileUrl)} alt="Prescription" className="w-full max-h-48 object-contain" />
                    <a href={mediaUrl(rx.uploadedFileUrl)} target="_blank" rel="noopener noreferrer"
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center shadow hover:bg-white">
                      <ExternalLink className="w-3 h-3 text-farumasi-600" />
                    </a>
                  </div>
                ) : (
                  <a href={mediaUrl(rx.uploadedFileUrl)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-3 py-2.5 hover:bg-red-100">
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="flex-1 text-xs font-semibold text-red-700 truncate">
                      {rx.uploadedFileUrl.split("/").pop() ?? "PDF"}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  </a>
                )}
              </div>
            )}

            {/* Pharmacist-prepared cart items */}
            {isCartReady && rawItems.length > 0 && (
              <div className="px-4 pb-3">
                <div className="bg-farumasi-50 border border-farumasi-100 rounded-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-farumasi-100">
                    <p className="text-xs font-bold text-farumasi-700 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Pharmacist-Prepared Cart
                    </p>
                  </div>
                  <div className="p-3 space-y-2">
                    {rawItems.map((item, i) => {
                      const sm    = decodeSellMode(item.instructions);
                      const instr = decodeInstructions(item.instructions);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-white border border-farumasi-200 flex items-center justify-center shrink-0">
                            <Pill className="w-3 h-3 text-farumasi-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{item.medicine_name}</p>
                            {(item.dosage || item.frequency) && (
                              <p className="text-[10px] text-slate-400">
                                {[item.dosage, item.frequency].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {instr && <p className="text-[10px] text-farumasi-600 italic">{instr}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-[10px] font-bold text-farumasi-700 bg-white border border-farumasi-200 px-1.5 py-0.5 rounded-full">
                              ×{item.quantity ?? 1}
                            </span>
                            {sm === "partial" && (
                              <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
                                <Archive className="w-2.5 h-2.5 inline mr-0.5" />Partial
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {rx.notes && (
                    <div className="px-3 pb-3">
                      <p className="text-[10px] italic bg-white border border-farumasi-100 rounded-xl px-2 py-1.5 text-farumasi-700">
                        Note: {rx.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Non-cart medicine chips */}
            {!isCartReady && rx.items.length > 0 && (
              <div className="px-4 pb-3">
                <button onClick={() => onExpand(rx.id)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-farumasi-700">
                  <Pill className="w-3 h-3" />
                  {rx.items.length} medicine{rx.items.length !== 1 ? "s" : ""}
                  <span className="text-slate-300">{expanded ? "▴" : "▾"}</span>
                </button>
                {expanded && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rx.items.map((item) => (
                      <span key={item.id}
                        className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                        <Pill className="w-3 h-3 text-farumasi-500" />
                        {item.medicineName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-4 pb-4 space-y-2">
              {isCartReady && (
                <button onClick={() => onConfirmOrder(rx.id)}
                  className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                  <Send className="w-4 h-4" />
                  Confirm &amp; Place Order
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {rx.orderId && (
                <Link href={`/orders/${rx.orderId}`}
                  className="flex items-center justify-between bg-farumasi-50 border border-farumasi-100 rounded-2xl px-3 py-2.5 hover:bg-farumasi-100 transition-colors">
                  <span className="text-xs font-semibold text-farumasi-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> View linked order
                  </span>
                  <ChevronRight className="w-4 h-4 text-farumasi-500" />
                </Link>
              )}

              {canCancel && (
                <button onClick={() => onRequestCancel(rx.id)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-2xl transition-colors">
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Prescription
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button onClick={onUpload}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-3xl py-5 text-sm font-semibold text-farumasi-600 hover:border-farumasi-300 hover:bg-farumasi-50 transition-all">
        <Upload className="w-4 h-4" />
        Upload Another Prescription
      </button>
    </div>
  );
}

// ── Cancelled / Expired List ─────────────────────────────────────────────────

function CancelledList({ prescriptions, onUpload }: { prescriptions: DigitalPrescription[]; onUpload: () => void }) {
  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <XCircle className="w-14 h-14 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-600 font-semibold">No cancelled prescriptions</p>
        <p className="text-sm text-slate-400">Cancelled and expired prescriptions appear here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {prescriptions.map((rx) => {
        const meta       = STATUS_META[rx.status] ?? STATUS_META.cancelled;
        const StatusIcon = meta.icon;
        const isUploaded = rx.prescriptionType === "uploaded" || !!rx.uploadedFileUrl;
        return (
          <div key={rx.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 opacity-70">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              {isUploaded ? <ImageIcon className="w-5 h-5 text-slate-400" /> : <Pill className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">
                {isUploaded ? "Uploaded Prescription" : "Prescription"}
              </p>
              <p className="text-xs text-slate-400">{relativeDate(rx.issuedAt)}</p>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              meta.bg, meta.color, meta.border
            )}>
              <StatusIcon className="w-2.5 h-2.5" />
              {meta.label}
            </span>
          </div>
        );
      })}
      <button onClick={onUpload}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-3xl py-5 text-sm font-semibold text-farumasi-600 hover:border-farumasi-300 hover:bg-farumasi-50 transition-all">
        <Upload className="w-4 h-4" />
        Upload New Prescription
      </button>
    </div>
  );
}

// ── Upload Prescription ──────────────────────────────────────────────────────

function UploadPrescription({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslation();
  const [state, setUploadState]     = useState<UploadState>("idle");
  const [dragging, setDragging]     = useState(false);
  const [file, setFile]             = useState<UploadedFile | null>(null);
  const [rawFile, setRawFile]       = useState<File | null>(null);
  const [notes, setNotes]           = useState("");
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    const normalized = normalizeCaptureFile(f);
    const isImage =
      normalized.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(normalized.name);
    setFile({
      name: normalized.name,
      size: normalized.size,
      type: normalized.type || "image/jpeg",
      preview: isImage ? URL.createObjectURL(normalized) : null,
    });
    setRawFile(normalized);
    setUploadState("preview");
    setUploadError("");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f);
  };

  const handleUpload = async () => {
    if (!rawFile) return;
    setUploading(true); setUploadError("");
    try {
      const { url } = await prescriptionsService.uploadPrescriptionFile(rawFile);
      await prescriptionsService.createFromUpload(url, notes.trim() || undefined);
      setUploadState("success");
      setTimeout(onSuccess, 1500);
    } catch (e) {
      setUploadError(apiErrorDetail(e) ?? "Upload failed. Please try again.");
    } finally { setUploading(false); }
  };

  const handleReset = () => {
    setUploadState("idle"); setFile(null); setRawFile(null);
    setNotes(""); setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  if (state === "success") {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 py-16 flex flex-col items-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-farumasi-100 flex items-center justify-center mb-4">
          <CheckCircle className="w-10 h-10 text-farumasi-600" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">{t.rx_success_title}</h2>
        <p className="text-sm text-slate-500 max-w-xs">{t.rx_success_sub}</p>
      </div>
    );
  }

  if (state === "preview" && file) {
    const isImage = file.type.startsWith("image/");
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5">
          {isImage && file.preview && (
            <div className="rounded-2xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.preview} alt="Preview" className="w-full max-h-64 object-contain" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", isImage ? "bg-farumasi-50" : "bg-red-50")}>
              {isImage ? <ImageIcon className="w-6 h-6 text-farumasi-600" /> : <FileText className="w-6 h-6 text-red-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{Math.round(file.size / 1024)} KB</p>
            </div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5 mb-4 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Ensure the prescription is clearly readable before uploading.
          </p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the pharmacist…" rows={2}
            className="w-full rounded-2xl border border-slate-200 text-sm px-3 py-2.5 mb-3 resize-none outline-none focus:ring-2 focus:ring-farumasi-400/30" />
          {uploadError && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">{uploadError}</p>}
          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
              {t.rx_remove}
            </button>
            <button onClick={handleUpload} disabled={uploading}
              className="flex-1 h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
              {uploading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t.rx_uploading}</>
                : <><Upload className="w-4 h-4" />{t.rx_upload_btn}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-3xl flex flex-col items-center justify-center py-14 px-8 text-center transition-all cursor-pointer bg-white",
          dragging ? "border-farumasi-500 bg-farumasi-50 scale-[1.01]" : "border-slate-200 hover:border-farumasi-300 hover:bg-slate-50"
        )}>
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4", dragging ? "bg-farumasi-100" : "bg-slate-100")}>
          <Upload className={cn("w-8 h-8", dragging ? "text-farumasi-600" : "text-slate-400")} />
        </div>
        <p className="text-base font-bold text-slate-800 mb-1">{dragging ? t.rx_drop_here : t.rx_drop_title}</p>
        <p className="text-sm text-slate-500">{t.rx_or} <span className="text-farumasi-600 font-medium">{t.rx_or_browse}</span></p>
        <p className="text-xs text-slate-400 mt-3">{t.rx_formats}</p>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
        <div className="relative flex justify-center"><span className="bg-[#F6F8FB] px-3 text-xs text-slate-400">{t.rx_or}</span></div>
      </div>
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors"
      >
        <Camera className="w-5 h-5" />
        {t.rx_take_photo}
      </button>
      <div className="bg-farumasi-50 border border-farumasi-100 rounded-3xl p-5">
        <h3 className="text-sm font-bold text-farumasi-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-farumasi-600" />
          {t.rx_tips_title}
        </h3>
        <ul className="space-y-1.5 text-xs text-farumasi-700">
          <li>• {t.rx_tip_1}</li>
          <li>• {t.rx_tip_2}</li>
          <li>• {t.rx_tip_3}</li>
          <li>• {t.rx_tip_4}</li>
        </ul>
      </div>
    </div>
  );
}
