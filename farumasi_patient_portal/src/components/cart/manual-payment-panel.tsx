"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, Smartphone, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { paymentsService } from "@/lib/services/payments.service";
import { toast } from "sonner";
import type { ManualPaymentDraft } from "@/lib/checkout-progress";

export interface ManualMomoConfig {
  enabled: boolean;
  merchant_name?: string;
  pay_code?: string | null;
  dial_string?: string | null;
  instructions?: string | null;
}

interface ManualMoMoPaySectionProps {
  orderCode?: string;
  amount: number;
  config: ManualMomoConfig;
  formatPrice: (n: number) => string;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  draft: ManualPaymentDraft;
  onDraftChange: (draft: ManualPaymentDraft) => void;
  className?: string;
}

/** Dial code, amount, and proof upload — used inline on the payment step. */
export function ManualMoMoPaySection({
  orderCode,
  amount,
  config,
  formatPrice,
  phone = "",
  onPhoneChange,
  draft,
  onDraftChange,
  className,
}: ManualMoMoPaySectionProps) {
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
          toast.error(`${file.name} is larger than 10 MB`);
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
        onDraftChange({
          ...draft,
          proofUrls: [...draft.proofUrls, ...urls].slice(0, 10),
        });
      }
    } catch {
      toast.error("Could not upload proof. Try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeProof(url: string) {
    onDraftChange({
      ...draft,
      proofUrls: draft.proofUrls.filter((u) => u !== url),
    });
  }

  async function copyDial() {
    if (!dial) return;
    await navigator.clipboard.writeText(dial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/30">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
              Pay with MTN MoMo — {config.merchant_name ?? "FARUMASI"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              {config.instructions
                ?? "Dial the code below, pay the exact amount, then upload your confirmation below."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Amount to pay</p>
          <p className="mt-1 text-2xl font-extrabold text-farumasi-700 dark:text-emerald-400">
            {formatPrice(amount)}
          </p>
          {orderCode && (
            <p className="mt-1 text-xs text-slate-500">Order {orderCode}</p>
          )}
        </div>

        {dial ? (
          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Dial on your phone</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-center text-lg font-bold tracking-wide text-white">
                {dial}
              </code>
              <button
                type="button"
                onClick={() => void copyDial()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                aria-label="Copy dial code"
              >
                {copied ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-800 dark:text-amber-200">
            MoMo merchant code is not configured yet. Contact support or choose another payment method.
          </p>
        )}
      </div>

      {onPhoneChange && (
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            MoMo number used (optional)
          </label>
          <input
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="0781 234 567"
            type="tel"
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-farumasi-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Payment proof <span className="text-red-500">*</span>
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Upload screenshots or PDF receipts — you can add multiple files.
        </p>
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
          disabled={uploading || draft.proofUrls.length >= 10}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-sm font-semibold transition-colors",
            uploading
              ? "border-slate-200 text-slate-400"
              : "border-farumasi-300 text-farumasi-700 hover:bg-farumasi-50 dark:border-emerald-700 dark:text-emerald-400",
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : draft.proofUrls.length ? "Add more files" : "Upload proof"}
        </button>
        {draft.proofUrls.length > 0 && (
          <ul className="mt-3 space-y-2">
            {draft.proofUrls.map((url, i) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800"
              >
                <span className="truncate text-slate-600 dark:text-slate-300">Proof {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeProof(url)}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          MoMo transaction ID (optional)
        </label>
        <input
          value={draft.claimedRef}
          onChange={(e) => onDraftChange({ ...draft, claimedRef: e.target.value })}
          placeholder="If shown on your receipt"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Note (optional)
        </label>
        <textarea
          value={draft.note}
          onChange={(e) => onDraftChange({ ...draft, note: e.target.value })}
          rows={2}
          placeholder="Anything we should know about this payment?"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
      </div>
    </div>
  );
}

interface ManualPaymentPanelProps {
  orderId: string;
  orderCode: string;
  amount: number;
  config: ManualMomoConfig;
  formatPrice: (n: number) => string;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  draft?: ManualPaymentDraft;
  onDraftChange?: (draft: ManualPaymentDraft) => void;
  onSubmitted: () => void;
  onBack?: () => void;
}

/** Submit proof for an existing order (resume / order detail retry). */
export function ManualPaymentPanel({
  orderId,
  orderCode,
  amount,
  config,
  formatPrice,
  phone = "",
  onPhoneChange,
  draft: controlledDraft,
  onDraftChange,
  onSubmitted,
  onBack,
}: ManualPaymentPanelProps) {
  const [localDraft, setLocalDraft] = useState<ManualPaymentDraft>({
    proofUrls: [],
    note: "",
    claimedRef: "",
  });
  const draft = controlledDraft ?? localDraft;
  const setDraft = onDraftChange ?? setLocalDraft;
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!draft.proofUrls.length) {
      toast.error("Upload at least one payment screenshot or receipt.");
      return;
    }
    setSubmitting(true);
    try {
      await paymentsService.submitManual(orderId, {
        proof_urls: draft.proofUrls,
        patient_note: draft.note.trim() || undefined,
        claimed_reference: draft.claimedRef.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success("Payment proof submitted — we will confirm shortly.");
      onSubmitted();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Could not submit payment proof.";
      toast.error(typeof msg === "string" ? msg : "Could not submit payment proof.");
    } finally {
      setSubmitting(false);
    }
  }

  const dial = config.dial_string ?? (config.pay_code ? `*182*8*1*${config.pay_code}#` : null);

  return (
    <div className="space-y-5">
      <ManualMoMoPaySection
        orderCode={orderCode}
        amount={amount}
        config={config}
        formatPrice={formatPrice}
        phone={phone}
        onPhoneChange={onPhoneChange}
        draft={draft}
        onDraftChange={setDraft}
      />
      <div className="flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 dark:border-slate-600"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={submitting || !draft.proofUrls.length || !dial}
          onClick={() => void handleSubmit()}
          className={cn(
            "flex-1 rounded-2xl py-3.5 text-sm font-bold text-white transition-colors",
            draft.proofUrls.length && dial && !submitting
              ? "bg-farumasi-600 hover:bg-farumasi-700"
              : "cursor-not-allowed bg-slate-300 dark:bg-slate-700",
          )}
        >
          {submitting ? "Submitting…" : "Submit payment proof"}
        </button>
      </div>
    </div>
  );
}
