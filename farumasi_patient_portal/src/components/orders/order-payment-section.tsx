"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Banknote,
  Clock,
  MessageSquare,
  Receipt,
} from "lucide-react";
import { PaymentCheckout, type PaymentMethodId } from "@/components/cart/payment-checkout";
import type { ManualMomoConfig } from "@/components/cart/manual-payment-panel";
import type { ManualPaymentDraft } from "@/lib/checkout-progress";
import type { PaymentStatusResult } from "@/lib/services/payments.service";
import { formatPrice } from "@/lib/utils";

interface OrderPaymentSectionProps {
  paymentDetail: PaymentStatusResult;
  orderTotal: number;
  paymentStatus: string;
  retryPaymentMethod: PaymentMethodId;
  onMethodChange: (m: PaymentMethodId) => void;
  retryPhone: string;
  onPhoneChange: (v: string) => void;
  feePercent: number;
  enabledMethods: PaymentMethodId[];
  manualMomoConfig: ManualMomoConfig | null;
  manualDraft: ManualPaymentDraft;
  onManualDraftChange: (d: ManualPaymentDraft) => void;
  submittingManual: boolean;
  retryingPayment: boolean;
  retryPhoneReady: boolean;
  onSubmitManual: () => void;
  onRetryPayment: () => void;
  onRefresh?: () => void;
}

export function OrderPaymentSection({
  paymentDetail,
  orderTotal,
  paymentStatus,
  retryPaymentMethod,
  onMethodChange,
  retryPhone,
  onPhoneChange,
  feePercent,
  enabledMethods,
  manualMomoConfig,
  manualDraft,
  onManualDraftChange,
  submittingManual,
  retryingPayment,
  retryPhoneReady,
  onSubmitManual,
  onRetryPayment,
  onRefresh,
}: OrderPaymentSectionProps) {
  const payable = Math.round(paymentDetail.payable_balance ?? paymentDetail.amount_due ?? 0);
  const balanceDue = Math.round(paymentDetail.balance_due ?? payable);
  const paid = paymentDetail.amount_paid_order ?? paymentDetail.amount_paid ?? 0;
  const total = paymentDetail.total_amount ?? orderTotal;
  const manualNoFee = retryPaymentMethod === "manual_momo";
  const effectiveFeePercent = manualNoFee ? 0 : feePercent;
  const procFee = manualNoFee
    ? 0
    : Math.round(
        paymentDetail.processing_fee_on_balance ?? paymentDetail.processing_fee ?? payable * feePercent / 100,
      );
  const chargeAmount = manualNoFee
    ? payable
    : Math.round(paymentDetail.charge_amount ?? payable + procFee);
  const awaitingReview = paymentDetail.awaiting_manual_review || paymentStatus === "awaiting_review";
  const canPay = paymentDetail.can_submit_payment !== false && payable > 0 && !awaitingReview;
  const deliveryOnArrival =
    Boolean(paymentDetail.medicines_paid) &&
    payable <= 0 &&
    (paymentDetail.delivery_fee_outstanding ?? 0) > 0;

  useEffect(() => {
    if (!awaitingReview || !onRefresh) return;
    const id = window.setInterval(onRefresh, 15_000);
    return () => window.clearInterval(id);
  }, [awaitingReview, onRefresh]);

  if (paymentDetail.fully_paid && payable <= 0 && !deliveryOnArrival) {
    return null;
  }

  return (
    <div className="space-y-4 mb-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-start gap-2 mb-4">
          <Receipt className="w-5 h-5 text-farumasi-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Payment summary</p>
            {paymentDetail.message && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {paymentDetail.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Order total</span>
            <span className="font-semibold">{formatPrice(total)}</span>
          </div>
          {paid > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
              <span>Paid so far</span>
              <span className="font-semibold">− {formatPrice(paid)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between text-slate-800 dark:text-slate-100">
              <span>Balance on order</span>
              <span className="font-bold">{formatPrice(balanceDue)}</span>
            </div>
          )}
          {payable > 0 && payable !== balanceDue && (
            <div className="flex justify-between text-violet-700 dark:text-violet-300">
              <span>Due now (app)</span>
              <span className="font-bold">{formatPrice(payable)}</span>
            </div>
          )}
          {(paymentDetail.delivery_fee_outstanding ?? 0) > 0 && (
            <div className="flex justify-between text-amber-700 dark:text-amber-300 text-xs">
              <span>Delivery fee outstanding</span>
              <span className="font-semibold">
                {formatPrice(paymentDetail.delivery_fee_outstanding ?? 0)}
                {paymentDetail.defer_delivery_fee ? " · on arrival" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {paymentDetail.admin_review_note && (
        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 rounded-3xl px-4 py-3">
          <p className="text-xs font-bold text-sky-900 dark:text-sky-100 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Message from FARUMASI finance
          </p>
          <p className="text-sm text-sky-900 dark:text-sky-100 mt-1.5 leading-relaxed whitespace-pre-wrap">
            {paymentDetail.admin_review_note}
          </p>
        </div>
      )}

      {deliveryOnArrival && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-3xl px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
          Medicines are paid. Your pharmacy can prepare the order. Pay the delivery fee of{" "}
          {formatPrice(paymentDetail.delivery_fee_outstanding ?? 0)} when the rider arrives.
        </div>
      )}

      {awaitingReview && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-3xl px-4 py-3">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Payment proof under review
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
            We received your MoMo proof
            {chargeAmount > 0 ? ` for ${formatPrice(chargeAmount)}` : ""}.
            Finance will confirm shortly — you can submit another proof only after we respond.
          </p>
        </div>
      )}

      {canPay && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-amber-200 dark:border-amber-800/50 shadow-sm p-5">
          <div className="flex items-start gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {paid > 0 ? "Pay remaining balance" : "Payment required"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {manualNoFee
                  ? `Dial the MoMo pay code for ${formatPrice(chargeAmount)} (no processing fee), upload proof, and wait for confirmation. You can repeat this until the order is fully paid.`
                  : `Pay ${formatPrice(chargeAmount)} (includes ${effectiveFeePercent}% fee on ${formatPrice(payable)}). You can repeat until the order is fully paid.`}
              </p>
            </div>
          </div>

          <PaymentCheckout
            method={retryPaymentMethod}
            onMethodChange={onMethodChange}
            phone={retryPhone}
            onPhoneChange={onPhoneChange}
            feePercent={effectiveFeePercent}
            orderSubtotal={payable}
            processingFee={procFee}
            totalWithFee={chargeAmount}
            formatPrice={formatPrice}
            enabledMethods={enabledMethods}
            manualConfig={manualMomoConfig}
            manualDraft={manualDraft}
            onManualDraftChange={onManualDraftChange}
          />

          {retryPaymentMethod === "manual_momo" ? (
            <button
              type="button"
              onClick={onSubmitManual}
              disabled={submittingManual || !manualDraft.proofUrls.length}
              className="w-full mt-5 flex items-center justify-center gap-2 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              <Banknote className="w-4 h-4" />
              {submittingManual ? "Submitting…" : `Submit proof · ${formatPrice(chargeAmount)}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetryPayment}
              disabled={retryingPayment || !retryPhoneReady}
              className="w-full mt-5 flex items-center justify-center gap-2 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
            >
              <Banknote className="w-4 h-4" />
              {retryingPayment ? "Starting payment…" : `Pay now · ${formatPrice(chargeAmount)}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
