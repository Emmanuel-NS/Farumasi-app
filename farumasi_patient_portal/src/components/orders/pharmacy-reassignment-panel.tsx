"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RESPONSE_WINDOW_MIN = 10;

export type ReassignmentOption = {
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  provider_name: string;
  estimated_subtotal: number;
  delivery_fee: number;
  estimated_total: number;
  amount_paid: number;
  requires_refund: boolean;
  refund_amount: number;
};

export type ReassignmentData = {
  amount_paid: number;
  can_reassign: boolean;
  partner_response_due_at?: string | null;
  options: ReassignmentOption[];
};

type PanelPhase = "loading" | "waiting" | "ready" | "empty";

interface PharmacyReassignmentPanelProps {
  pharmacyName: string;
  data: ReassignmentData | null;
  waitMs: number | null;
  waitLabel: string | null;
  showCheaperPharmacies: boolean;
  onShowCheaperChange: (value: boolean) => void;
  reassigningId: string | null;
  onReassign: (opt: ReassignmentOption) => void;
  formatPrice: (n: number) => string;
  variant?: "hero" | "compact";
}

function CountdownRing({
  waitMs,
  waitLabel,
  progress,
}: {
  waitMs: number | null;
  waitLabel: string | null;
  progress: number;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const circumference = 2 * Math.PI * 42;
  const dash = circumference * (1 - pct / 100);

  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/15" />
        <circle
          cx="48"
          cy="48"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-amber-300 transition-all duration-1000"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
        />
      </svg>
      <div className="relative text-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">Switch in</p>
        <p className="text-2xl font-black tabular-nums text-white">{waitLabel ?? "—"}</p>
        {waitMs != null && waitMs <= 0 && (
          <p className="text-[10px] font-bold text-emerald-300">Ready now</p>
        )}
      </div>
    </div>
  );
}

function StepPills({ phase }: { phase: PanelPhase }) {
  const steps = [
    { id: "paid", label: "Paid" },
    { id: "waiting", label: "Pharmacy responds" },
    { id: "switch", label: "Switch if needed" },
  ] as const;

  const activeIdx = phase === "loading" || phase === "waiting" ? 1 : 2;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold",
              done && "bg-emerald-500/20 text-emerald-100",
              active && "bg-white/15 text-white ring-1 ring-white/25",
              !done && !active && "bg-white/5 text-white/45",
            )}
          >
            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="tabular-nums">{i + 1}</span>}
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

export function PharmacyReassignmentPanel({
  pharmacyName,
  data,
  waitMs,
  waitLabel,
  showCheaperPharmacies,
  onShowCheaperChange,
  reassigningId,
  onReassign,
  formatPrice,
  variant = "hero",
}: PharmacyReassignmentPanelProps) {
  const [confirmOpt, setConfirmOpt] = useState<ReassignmentOption | null>(null);

  const phase: PanelPhase = useMemo(() => {
    if (data == null) return "loading";
    if (!data.can_reassign) return "waiting";
    if (data.options.length === 0) return "empty";
    return "ready";
  }, [data]);

  const progress = useMemo(() => {
    if (waitMs == null || data?.partner_response_due_at == null) return 0;
    const due = new Date(data.partner_response_due_at).getTime();
    const start = due - RESPONSE_WINDOW_MIN * 60 * 1000;
    const total = due - start;
    if (total <= 0) return 1;
    const elapsed = Date.now() - start;
    return Math.min(1, Math.max(0, elapsed / total));
  }, [waitMs, data?.partner_response_due_at]);

  const isCompact = variant === "compact";

  return (
    <>
      <div
        id="pharmacy-reassign"
        className={cn(
          "relative overflow-hidden rounded-3xl border shadow-lg mb-4",
          phase === "ready"
            ? "border-emerald-400/40 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950"
            : phase === "empty"
              ? "border-amber-400/30 bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900"
              : "border-amber-400/30 bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950",
        )}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-8 left-1/4 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className={cn("relative", isCompact ? "p-4" : "p-5 md:p-6")}>
          {/* Header row */}
          <div className={cn("flex gap-4", isCompact ? "flex-col sm:flex-row sm:items-center" : "flex-col md:flex-row md:items-start")}>
            {phase === "waiting" && !isCompact && (
              <CountdownRing waitMs={waitMs} waitLabel={waitLabel} progress={progress} />
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                  {phase === "ready" ? (
                    <>
                      <ArrowRightLeft className="h-3 w-3" /> Action available
                    </>
                  ) : phase === "empty" ? (
                    <>
                      <RefreshCw className="h-3 w-3" /> No match yet
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" /> Awaiting pharmacy
                    </>
                  )}
                </span>
                {phase === "ready" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white animate-pulse">
                    Tap a pharmacy below
                  </span>
                )}
              </div>

              <h2 className="text-lg font-extrabold tracking-tight text-white md:text-xl">
                {phase === "ready"
                  ? "Switch to a pharmacy that can confirm faster"
                  : phase === "empty"
                    ? "No alternative at your paid price yet"
                    : phase === "loading"
                      ? "Checking your options…"
                      : `${pharmacyName} has not confirmed yet`}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {phase === "loading" && "We are looking for other pharmacies that can fulfill your order."}
                {phase === "waiting" && (
                  <>
                    Your payment is safe. Partners have{" "}
                    <span className="font-bold text-white">{RESPONSE_WINDOW_MIN} minutes</span> to accept.
                    {waitLabel && waitMs != null && waitMs > 0 && (
                      <> After that you can move your order — same price, no extra payment.</>
                    )}
                  </>
                )}
                {phase === "ready" && (
                  <>
                    {pharmacyName} missed the {RESPONSE_WINDOW_MIN}-minute window. Choose a new partner —
                    your {formatPrice(data!.amount_paid)} payment transfers automatically.
                  </>
                )}
                {phase === "empty" && (
                  <>
                    {pharmacyName} has not accepted. We could not find another partner at{" "}
                    {formatPrice(data!.amount_paid)}. Try cheaper options below or wait a little longer.
                  </>
                )}
              </p>

              {!isCompact && <div className="mt-4"><StepPills phase={phase} /></div>}
            </div>

            {phase === "waiting" && isCompact && waitLabel && (
              <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200">Switch in</p>
                <p className="text-xl font-black tabular-nums text-white">{waitLabel}</p>
              </div>
            )}

            <ShieldCheck className={cn("shrink-0 text-emerald-400/80", isCompact ? "hidden sm:block h-6 w-6" : "h-7 w-7")} />
          </div>

          {/* Waiting progress bar (mobile-friendly) */}
          {phase === "waiting" && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-white/50">
                <span>Response window</span>
                <span>{Math.round(progress * 100)}% elapsed</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Loading */}
          {phase === "loading" && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-8 text-sm font-semibold text-white/70">
              <Loader2 className="h-5 w-5 animate-spin" />
              Finding pharmacies…
            </div>
          )}

          {/* Cheaper toggle */}
          {(phase === "ready" || phase === "empty") && (
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-3.5 transition-colors hover:bg-white/10">
              <input
                type="checkbox"
                checked={showCheaperPharmacies}
                onChange={(e) => onShowCheaperChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/30 accent-emerald-500"
              />
              <div>
                <p className="text-sm font-bold text-white">Include cheaper pharmacies</p>
                <p className="text-xs text-white/60 mt-0.5">
                  We will refund the price difference if the new total is lower.
                </p>
              </div>
            </label>
          )}

          {/* Pharmacy options */}
          {phase === "ready" && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200/90">
                {data!.options.length} alternative{data!.options.length !== 1 ? "s" : ""} available
              </p>
              {data!.options.map((opt) => {
                const key = opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name;
                const busy = reassigningId === key;
                return (
                  <div
                    key={key}
                    className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-md"
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-farumasi-600 text-white shadow-sm">
                        <Store className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold text-slate-900">{opt.provider_name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Medicines {formatPrice(opt.estimated_subtotal)}
                          {" · "}Delivery {formatPrice(opt.delivery_fee)}
                        </p>
                        {opt.requires_refund && (
                          <p className="mt-1 text-xs font-semibold text-amber-700">
                            Refund {formatPrice(opt.refund_amount)} to your wallet
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-farumasi-700">{formatPrice(opt.estimated_total)}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Same order</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={reassigningId != null}
                      onClick={() => setConfirmOpt(opt)}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 border-t py-3.5 text-sm font-extrabold transition-colors",
                        busy
                          ? "bg-slate-100 text-slate-400"
                          : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
                      )}
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Moving order…
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="h-4 w-4" />
                          Switch to {opt.provider_name.split(" ")[0]}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {phase === "empty" && (
            <div className="mt-5 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center">
              <Store className="mx-auto h-8 w-8 text-white/30" />
              <p className="mt-2 text-sm font-semibold text-white/80">
                Keep this page open — options may appear as more pharmacies come online.
              </p>
              <button
                type="button"
                onClick={() => onShowCheaperChange(!showCheaperPharmacies)}
                className="mt-3 text-xs font-bold text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
              >
                {showCheaperPharmacies ? "Hide cheaper options" : "Search cheaper pharmacies"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmOpt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !reassigningId && setConfirmOpt(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setConfirmOpt(null)}
              disabled={!!reassigningId}
              className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50">
              <ArrowRightLeft className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Switch pharmacy?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Your order will move from <span className="font-bold">{pharmacyName}</span> to{" "}
              <span className="font-bold text-farumasi-700 dark:text-emerald-300">{confirmOpt.provider_name}</span>.
              {" "}No extra payment — total stays {formatPrice(confirmOpt.estimated_total)}.
            </p>
            {confirmOpt.requires_refund && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                You will receive a {formatPrice(confirmOpt.refund_amount)} refund for the price difference.
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={!!reassigningId}
                onClick={() => setConfirmOpt(null)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Keep waiting
              </button>
              <button
                type="button"
                disabled={!!reassigningId}
                onClick={() => {
                  onReassign(confirmOpt);
                  setConfirmOpt(null);
                }}
                className="flex-1 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Yes, switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Inline badge for order list cards */
export function PharmacyReassignmentBadge({
  canReassign,
  waitLabel,
  waitMs,
}: {
  canReassign?: boolean;
  waitLabel?: string | null;
  waitMs?: number | null;
}) {
  if (canReassign) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm animate-pulse">
        <ArrowRightLeft className="h-3 w-3" />
        Switch pharmacy
      </span>
    );
  }
  if (waitLabel && waitMs != null && waitMs > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-200">
        <Clock className="h-3 w-3" />
        Switch in {waitLabel}
      </span>
    );
  }
  return null;
}
