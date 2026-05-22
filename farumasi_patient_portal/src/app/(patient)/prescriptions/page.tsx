"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, Camera, FileText, Image, CheckCircle, X, AlertCircle,
  Clock, Send, Package, XCircle, ChevronRight, Eye, MapPin,
  Pill, Plus, QrCode, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { GuestGate } from "@/components/shared/guest-gate";
import { mockDigitalPrescriptions } from "@/data/mock";
import type { DigitalPrescription, DigitalPrescriptionStatus } from "@/types";

type Tab = "my_prescriptions" | "upload";
type UploadState = "idle" | "preview" | "success";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview: string | null;
}

const STATUS_META: Record<DigitalPrescriptionStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:               { label: "Draft",           color: "text-slate-600",     bg: "bg-slate-100",     icon: FileText },
  active:              { label: "Active",           color: "text-blue-600",      bg: "bg-blue-100",      icon: Clock },
  sent_to_patient:     { label: "Ready to Use",     color: "text-farumasi-700",  bg: "bg-farumasi-100",  icon: Send },
  patient_viewing:     { label: "Reviewing",        color: "text-blue-700",      bg: "bg-blue-50",       icon: Eye },
  order_placed:        { label: "Order Placed",     color: "text-purple-700",    bg: "bg-purple-100",    icon: Package },
  partially_fulfilled: { label: "Partly Filled",    color: "text-orange-700",    bg: "bg-orange-100",    icon: AlertCircle },
  fulfilled:           { label: "Fulfilled",        color: "text-green-700",     bg: "bg-green-100",     icon: CheckCircle },
  expired:             { label: "Expired",          color: "text-red-700",       bg: "bg-red-100",       icon: XCircle },
  cancelled:           { label: "Cancelled",        color: "text-slate-600",     bg: "bg-slate-100",     icon: X },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatExpiry(iso: string) {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { label: "Expired", urgent: true };
  if (diff === 0) return { label: "Expires today", urgent: true };
  if (diff <= 3) return { label: `Expires in ${diff} day${diff > 1 ? "s" : ""}`, urgent: true };
  return { label: `Expires ${formatDate(iso)}`, urgent: false };
}

export default function PrescriptionsPage() {
  const [tab, setTab] = useState<Tab>("my_prescriptions");

  return (
    <GuestGate feature="prescriptions">
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Your digital and uploaded prescriptions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6 w-fit">
          <button
            onClick={() => setTab("my_prescriptions")}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all",
              tab === "my_prescriptions"
                ? "bg-white text-farumasi-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText className="w-4 h-4" />
            My Prescriptions
            {mockDigitalPrescriptions.length > 0 && (
              <span className="ml-1 text-[10px] bg-farumasi-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                {mockDigitalPrescriptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("upload")}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all",
              tab === "upload"
                ? "bg-white text-farumasi-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
        </div>

        {tab === "my_prescriptions" ? (
          <PrescriptionHistory
            prescriptions={mockDigitalPrescriptions}
            onUpload={() => setTab("upload")}
          />
        ) : (
          <UploadPrescription onSuccess={() => setTab("my_prescriptions")} />
        )}
      </div>
    </GuestGate>
  );
}

// â”€â”€ Prescription History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function PrescriptionHistory({
  prescriptions,
  onUpload,
}: {
  prescriptions: DigitalPrescription[];
  onUpload: () => void;
}) {
  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">No prescriptions yet</h3>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Digital prescriptions from your doctor appear here. You can also upload a paper prescription.
        </p>
        <button
          onClick={onUpload}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-farumasi-600 border border-farumasi-200 px-4 py-2 rounded-xl hover:bg-farumasi-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload a prescription
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((rx) => {
        const meta = STATUS_META[rx.status];
        const StatusIcon = meta.icon;
        const expiry = formatExpiry(rx.expiresAt);
        const isActionable =
          rx.status === "sent_to_patient" || rx.status === "patient_viewing";

        return (
          <div
            key={rx.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="p-4 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-farumasi-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-farumasi-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Prescription from {rx.doctorName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {rx.hospitalName ?? "Hospital"} Â· {formatDate(rx.issuedAt)}
                    </p>
                    {rx.diagnosis && (
                      <p className="text-xs text-slate-600 mt-1 font-medium">{rx.diagnosis}</p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0",
                    meta.bg,
                    meta.color
                  )}
                >
                  <StatusIcon className="w-3 h-3" />
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Medicines */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {rx.items.length} Medicine{rx.items.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rx.items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"
                  >
                    <Pill className="w-3 h-3 text-farumasi-500" />
                    {item.medicineName} {item.strength}
                  </span>
                ))}
              </div>
            </div>

            {/* Expiry + QR */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <CalendarDays
                  className={cn("w-3.5 h-3.5", expiry.urgent ? "text-red-500" : "text-slate-400")}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    expiry.urgent ? "text-red-600" : "text-slate-500"
                  )}
                >
                  {expiry.label}
                </span>
              </div>
              {rx.qrCode && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="font-mono">{rx.id.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* CTA: Find pharmacy */}
            {isActionable && (
              <div className="px-4 pb-4">
                <div className="bg-farumasi-50 border border-farumasi-100 rounded-2xl p-3">
                  <p className="text-xs text-farumasi-700 font-medium mb-2.5">
                    Your prescription is ready. Find the best pharmacy to fill it:
                  </p>
                  <Link
                    href={`/store?prescription=${rx.id}`}
                    className="inline-flex items-center gap-2 w-full justify-center text-sm font-semibold bg-farumasi-600 text-white px-4 py-2.5 rounded-xl hover:bg-farumasi-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Find Recommended Pharmacies
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* CTA: View order */}
            {rx.orderId && rx.status === "order_placed" && (
              <div className="px-4 pb-4">
                <Link
                  href="/orders"
                  className="flex items-center justify-between text-sm font-medium text-farumasi-600 bg-farumasi-50 border border-farumasi-100 rounded-2xl px-3 py-2.5 hover:bg-farumasi-100 transition-colors"
                >
                  <span>View order status</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        );
      })}

      {/* Upload CTA at bottom */}
      <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center">
        <p className="text-sm text-slate-500 mb-3">Have a paper prescription?</p>
        <button
          onClick={onUpload}
          className="inline-flex items-center gap-2 text-sm font-semibold text-farumasi-600 border border-farumasi-200 px-4 py-2 rounded-xl hover:bg-farumasi-50 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Prescription
        </button>
      </div>
    </div>
  );
}

// â”€â”€ Upload Prescription â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function UploadPrescription({ onSuccess }: { onSuccess: () => void }) {
  const t = useTranslation();
  const [state, setUploadState] = useState<UploadState>("idle");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (f: File) => {
    const isImage = f.type.startsWith("image/");
    const preview = isImage ? URL.createObjectURL(f) : null;
    setFile({ name: f.name, size: f.size, type: f.type, preview });
    setUploadState("preview");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadState("success");
      setTimeout(onSuccess, 1600);
    }, 2000);
  };

  const handleReset = () => {
    setUploadState("idle");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (state === "success") {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-16 flex flex-col items-center text-center px-8">
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
    const sizeKb = Math.round(file.size / 1024);
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
              {isImage && file.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-10 h-10 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sizeKb} KB</p>
              {isImage && (
                <div className="flex items-center gap-1 mt-2 text-xs text-farumasi-700 bg-farumasi-50 rounded-xl px-2 py-1 w-fit">
                  <Image className="w-3 h-3" />
                  Image detected
                </div>
              )}
            </div>
            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-3 mb-4">
            Verify all prescription details are clearly visible before uploading.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              {t.rx_remove}
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.rx_uploading}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t.rx_upload_btn}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Idle
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-3xl flex flex-col items-center justify-center py-16 px-8 text-center transition-all cursor-pointer bg-white",
          dragging
            ? "border-farumasi-500 bg-farumasi-50 scale-[1.01]"
            : "border-slate-200 hover:border-farumasi-300 hover:bg-slate-50"
        )}
      >
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
          dragging ? "bg-farumasi-100" : "bg-slate-100"
        )}>
          <Upload className={cn("w-8 h-8", dragging ? "text-farumasi-600" : "text-slate-400")} />
        </div>
        <p className="text-base font-bold text-slate-800 mb-1">
          {dragging ? t.rx_drop_here : t.rx_drop_title}
        </p>
        <p className="text-sm text-slate-500">
          {t.rx_or} <span className="text-farumasi-600 font-medium">{t.rx_or_browse}</span>
        </p>
        <p className="text-xs text-slate-400 mt-3">{t.rx_formats}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#F6F8FB] px-3 text-xs text-slate-400">{t.rx_or}</span>
        </div>
      </div>

      <button className="w-full h-12 rounded-2xl border-2 border-farumasi-200 text-farumasi-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-farumasi-50 transition-colors">
        <Camera className="w-5 h-5" />
        {t.rx_take_photo}
      </button>

      {/* Tips */}
      <div className="mt-6 bg-farumasi-50 border border-farumasi-100 rounded-3xl p-5">
        <h3 className="text-sm font-bold text-farumasi-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-farumasi-600" />
          {t.rx_tips_title}
        </h3>
        <ul className="space-y-1.5 text-xs text-farumasi-700">
          <li>â€¢ {t.rx_tip_1}</li>
          <li>â€¢ {t.rx_tip_2}</li>
          <li>â€¢ {t.rx_tip_3}</li>
          <li>â€¢ {t.rx_tip_4}</li>
        </ul>
      </div>
    </div>
  );
}
