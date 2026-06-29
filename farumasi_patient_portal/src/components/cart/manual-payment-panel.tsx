"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { paymentsService } from "@/lib/services/payments.service";
import { toast } from "sonner";
import type { ManualPaymentDraft } from "@/lib/checkout-progress";
import { PaymentCheckout } from "@/components/cart/payment-checkout";

export interface ManualMomoConfig {
  enabled: boolean;
  merchant_name?: string;
  pay_code?: string | null;
  dial_string?: string | null;
  instructions?: string | null;
}

interface ManualPaymentPanelProps {
  orderId: string;
  orderCode: string;
  amount: number;
  config: ManualMomoConfig;
  formatPrice: (n: number) => string;
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

  const dial = config.dial_string ?? (config.pay_code ? `*182*8*1*${config.pay_code}#` : null);

  async function handleSubmit() {
    if (!draft.proofUrls.length) {
      toast.error("Upload your payment screenshot first.");
      return;
    }
    setSubmitting(true);
    try {
      await paymentsService.submitManual(orderId, {
        proof_urls: draft.proofUrls,
        patient_note: draft.note.trim() || undefined,
      });
      toast.success("Proof submitted — we'll confirm shortly.");
      onSubmitted();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? "Could not submit proof.";
      toast.error(typeof msg === "string" ? msg : "Could not submit proof.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Order {orderCode}</p>
      <PaymentCheckout
        method="manual_momo"
        onMethodChange={() => {}}
        phone=""
        onPhoneChange={() => {}}
        feePercent={0}
        orderSubtotal={amount}
        processingFee={0}
        totalWithFee={amount}
        formatPrice={formatPrice}
        enabledMethods={["manual_momo"]}
        manualConfig={config}
        manualDraft={draft}
        onManualDraftChange={setDraft}
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
          {submitting ? "Submitting…" : "Submit proof"}
        </button>
      </div>
    </div>
  );
}
