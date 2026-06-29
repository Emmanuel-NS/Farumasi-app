"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Copy,
  Loader2,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import type { ManualPaymentDraft } from "@/lib/checkout-progress";
import type { ManualMomoConfig } from "@/components/cart/manual-payment-panel";

export type PaymentMethodId = "mtn_momo" | "card" | "manual_momo";

const METHOD_META: Record<
  PaymentMethodId,
  { label: string; short: string; accent: string; accentSoft: string; border: string }
> = {
  manual_momo: {
    label: "MoMo Pay Code",
    short: "Dial & upload proof",
    accent: "text-emerald-700 dark:text-emerald-300",
    accentSoft: "bg-emerald-500",
    border: "border-emerald-400 dark:border-emerald-500",
  },
  mtn_momo: {
    label: "MTN MoMo",
    short: "Approve on your phone",
    accent: "text-amber-700 dark:text-amber-300",
    accentSoft: "bg-amber-400",
    border: "border-amber-400 dark:border-amber-500",
  },
  card: {
    label: "Card",
    short: "Visa · Mastercard",
    accent: "text-blue-700 dark:text-blue-300",
    accentSoft: "bg-blue-600",
    border: "border-blue-500 dark:border-blue-400",
  },
};

const METHOD_ORDER: PaymentMethodId[] = ["manual_momo", "mtn_momo", "card"];

function MethodIcon({ id, className }: { id: PaymentMethodId; className?: string }) {
  if (id === "card") return <CreditCard className={className} />;
  return <Smartphone className={className} />;
}

interface PaymentCheckoutProps {
  method: PaymentMethodId;
  onMethodChange: (method: PaymentMethodId) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  feePercent: number;
  orderSubtotal: number;
  processingFee: number;
  totalWithFee: number;
  formatPrice: (n: number) => string;
  momoNumberLabel?: string;
  enabledMethods?: PaymentMethodId[];
  manualConfig?: ManualMomoConfig | null;
  manualDraft?: ManualPaymentDraft;
  onManualDraftChange?: (draft: ManualPaymentDraft) => void;
}

export function PaymentCheckout({
  method,
  onMethodChange,
  phone,
  onPhoneChange,
  feePercent,
  orderSubtotal,
  processingFee,
  totalWithFee,
  formatPrice,
  momoNumberLabel = "MTN number",
  enabledMethods,
  manualConfig,
  manualDraft,
  onManualDraftChange,
}: PaymentCheckoutProps) {
  const methods = METHOD_ORDER.filter((id) =>
    enabledMethods ? enabledMethods.includes(id) : true,
  );
  const selected = methods.includes(method) ? method : methods[0]!;
  const meta = METHOD_META[selected];
  const showManual =
    selected === "manual_momo" && manualConfig?.enabled && manualDraft && onManualDraftChange;

  return (
    <div className="space-y-4">
      {/* Total — always visible */}
      <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">Pay now</p>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{formatPrice(totalWithFee)}</p>
        {processingFee > 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Includes {feePercent}% fee · medicines {formatPrice(orderSubtotal)}
          </p>
        )}
      </div>

      {/* Manual MoMo — pinned when selected */}
      {showManual && (
        <ManualPayBlock
          amount={totalWithFee}
          config={manualConfig}
          formatPrice={formatPrice}
          draft={manualDraft}
          onDraftChange={onManualDraftChange}
        />
      )}

      {selected === "mtn_momo" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            {momoNumberLabel} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              +250
            </span>
            <input
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="0781 234 567"
              type="tel"
              autoComplete="tel"
              className="h-12 w-full rounded-xl border-2 border-amber-200 bg-white pl-14 pr-4 text-base font-semibold text-slate-900 outline-none focus:border-amber-400 dark:border-amber-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-300/80">
            You&apos;ll approve the payment on your phone.
          </p>
        </div>
      )}

      {selected === "card" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <p className="text-sm text-blue-900 dark:text-blue-100">Secure Pesapal checkout after you place the order.</p>
        </div>
      )}

      {/* Method switcher */}
      {methods.length > 1 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {showManual ? "Or pay another way" : "Payment method"}
          </p>
          <div className="flex flex-wrap gap-2">
            {methods.map((id) => {
              const m = METHOD_META[id];
              const active = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onMethodChange(id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                    active
                      ? cn("border-l-4 bg-white shadow-sm dark:bg-slate-800", m.border)
                      : "border-slate-200 bg-slate-50 hover:bg-white dark:border-slate-600 dark:bg-slate-800/80",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                      m.accentSoft,
                    )}
                  >
                    <MethodIcon id={id} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-xs font-bold leading-tight", active ? "text-slate-900 dark:text-slate-100" : "text-slate-600")}>
                      {m.label}
                      {id === "manual_momo" && methods[0] === "manual_momo" && (
                        <span className="ml-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500">{m.short}</p>
                  </div>
                  {active && <CheckCircle2 className="ml-1 h-4 w-4 shrink-0 text-farumasi-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualPayBlock({
  amount,
  config,
  formatPrice,
  draft,
  onDraftChange,
}: {
  amount: number;
  config: ManualMomoConfig;
  formatPrice: (n: number) => string;
  draft: ManualPaymentDraft;
  onDraftChange: (draft: ManualPaymentDraft) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dial = config.dial_string ?? (config.pay_code ? `*182*8*1*${config.pay_code}#` : null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10 MB)`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post<{ url: string }>("/uploads/payment-proof", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        urls.push(data.url);
      }
      if (urls.length) {
        onDraftChange({ ...draft, proofUrls: [...draft.proofUrls, ...urls].slice(0, 5) });
      }
    } catch {
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-4 dark:border-emerald-700 dark:from-emerald-950/40 dark:to-slate-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            {config.merchant_name ?? "FARUMASI"} · MoMo
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            Pay {formatPrice(amount)} exactly, then upload proof.
          </p>
        </div>
        <span className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold uppercase text-white">
          Step 1 → 2
        </span>
      </div>

      {dial ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-xl bg-slate-900 py-3 text-center text-lg font-bold tracking-wide text-white">
            {dial}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(dial);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
            aria-label="Copy dial code"
          >
            {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
          </button>
        </div>
      ) : (
        <p className="text-sm text-amber-700">Pay code not configured — choose another method.</p>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading || draft.proofUrls.length >= 5}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3.5 text-sm font-semibold transition-colors",
            draft.proofUrls.length
              ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50/80",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading
            ? "Uploading…"
            : draft.proofUrls.length
              ? `${draft.proofUrls.length} file(s) — add more`
              : "Upload payment screenshot"}
        </button>
        {draft.proofUrls.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {draft.proofUrls.map((url, i) => (
              <li
                key={url}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] text-slate-600 shadow-sm dark:bg-slate-800"
              >
                Proof {i + 1}
                <button
                  type="button"
                  onClick={() =>
                    onDraftChange({ ...draft, proofUrls: draft.proofUrls.filter((u) => u !== url) })
                  }
                  className="rounded p-0.5 text-slate-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
