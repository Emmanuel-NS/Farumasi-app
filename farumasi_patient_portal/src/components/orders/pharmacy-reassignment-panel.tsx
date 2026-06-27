"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Brain,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Store,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseApiDateTime } from "@/lib/datetime";

const RESPONSE_WINDOW_MIN = 10;

export type ReassignmentOption = {
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  provider_name: string;
  estimated_subtotal: number;
  delivery_fee: number;
  estimated_total: number;
  amount_paid: number;
  requires_refund?: boolean;
  refund_amount?: number;
  price_category?: "within_paid" | "below_paid" | "above_paid";
  can_switch?: boolean;
  requires_no_change_ack?: boolean;
  forfeit_amount?: number;
  extra_payment_required?: number;
  ai_rank?: number | null;
  ai_score?: number | null;
  ai_reasons?: string[];
};

export type ReassignmentData = {
  amount_paid: number;
  can_reassign: boolean;
  switch_enabled?: boolean;
  partner_response_due_at?: string | null;
  below_paid_count?: number;
  options: ReassignmentOption[];
};

interface PharmacyReassignmentPanelProps {
  pharmacyName: string;
  data: ReassignmentData | null;
  waitMs: number | null;
  waitLabel: string | null;
  includeBelowPaid: boolean;
  onIncludeBelowPaidChange: (value: boolean) => void;
  reassigningId: string | null;
  onReassign: (opt: ReassignmentOption, acceptNoChange: boolean) => void;
  formatPrice: (n: number) => string;
}

function CountdownRing({
  waitLabel,
  progress,
}: {
  waitLabel: string | null;
  progress: number;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const circumference = 2 * Math.PI * 42;
  const dash = circumference * (1 - pct / 100);

  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/20" />
        <circle
          cx="48" cy="48" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className="text-white/90 transition-all duration-1000"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
        />
      </svg>
      <div className="relative text-center">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">Ready in</p>
        <p className="text-xl font-black tabular-nums text-white">{waitLabel ?? "—"}</p>
      </div>
    </div>
  );
}

export function PharmacyReassignmentPanel({
  pharmacyName,
  data,
  waitMs,
  waitLabel,
  includeBelowPaid,
  onIncludeBelowPaidChange,
  reassigningId,
  onReassign,
  formatPrice,
}: PharmacyReassignmentPanelProps) {
  const [confirmOpt, setConfirmOpt] = useState<ReassignmentOption | null>(null);

  const switchEnabled = data?.switch_enabled ?? data?.can_reassign ?? false;
  const switchable = useMemo(
    () => (data?.options ?? []).filter((o) => o.can_switch !== false),
    [data?.options],
  );
  const samePriceOptions = useMemo(
    () =>
      switchable.filter(
        (o) => o.price_category === "within_paid" || o.price_category == null,
      ),
    [switchable],
  );
  const lowerPriceOptions = useMemo(
    () => switchable.filter((o) => o.price_category === "below_paid"),
    [switchable],
  );
  const viewOnly = useMemo(
    () => (data?.options ?? []).filter((o) => o.can_switch === false),
    [data?.options],
  );
  const topPicks = samePriceOptions.filter((o) => o.ai_rank != null && o.ai_rank <= 3);
  const otherSamePrice = samePriceOptions.filter((o) => !o.ai_rank || o.ai_rank > 3);
  const timerPending = waitMs != null && waitMs > 0;
  const belowPaidHidden = (data?.below_paid_count ?? 0) > 0 && !includeBelowPaid;

  const progress = useMemo(() => {
    if (waitMs == null || data?.partner_response_due_at == null) return 0;
    const due = parseApiDateTime(data.partner_response_due_at)?.getTime();
    if (due == null) return 0;
    const start = due - RESPONSE_WINDOW_MIN * 60 * 1000;
    const total = due - start;
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, (Date.now() - start) / total));
  }, [waitMs, data?.partner_response_due_at]);

  return (
    <>
      {/* Hero — positive framing */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-farumasi-700 p-6 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center">
          {!switchEnabled && timerPending && waitLabel && (
            <CountdownRing waitLabel={waitLabel} progress={progress} />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5" />
              Faster delivery helper
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Get your order moving faster</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              {switchEnabled ? (
                samePriceOptions.length > 0 || lowerPriceOptions.length > 0 ? (
                  <>
                    <span className="font-semibold text-white">{pharmacyName}</span> is taking longer than usual.
                    FARUMASI AI ranked other pharmacies that can confirm your same order — often within minutes.
                  </>
                ) : (
                  <>
                    The {RESPONSE_WINDOW_MIN}-minute window for{" "}
                    <span className="font-semibold text-white">{pharmacyName}</span> has passed, but no pharmacy at
                    your paid price is available to switch to right now. Try lower-price options below, or wait for{" "}
                    {pharmacyName} to confirm.
                  </>
                )
              ) : timerPending ? (
                <>
                  <span className="font-semibold text-white">{pharmacyName}</span> still has a short window to confirm.
                  Preview AI-matched alternatives below — you can switch after{" "}
                  <span className="font-bold text-white">{waitLabel ?? "the timer"}</span> if needed.
                </>
              ) : (
                <>
                  <span className="font-semibold text-white">{pharmacyName}</span> has not confirmed yet. Checking
                  whether switching is available… refresh in a moment if options stay locked.
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/90">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Payment stays secure
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1">
                <Zap className="h-3.5 w-3.5" /> Same medicines
              </span>
            </div>
          </div>
        </div>
      </div>

      {data == null ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          <Loader2 className="h-5 w-5 animate-spin" />
          Finding the best matches for you…
        </div>
      ) : (
        <div className="space-y-6">
          {switchEnabled &&
            samePriceOptions.length === 0 &&
            lowerPriceOptions.length === 0 &&
            (belowPaidHidden || viewOnly.length > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              {belowPaidHidden ? (
                <>
                  No pharmacy at your paid price can take this order right now.{" "}
                  <span className="font-bold">{data?.below_paid_count} lower-price option(s)</span> are available —
                  tick <span className="font-bold">Also show lower-price pharmacies</span> below to switch (no refund of
                  the difference).
                </>
              ) : (
                <>
                  Switching is unlocked, but every match costs more than you paid. Higher-priced switches are not
                  supported yet — wait for {pharmacyName} to confirm, or cancel and reorder.
                </>
              )}
            </div>
          )}

          {/* Lower-price opt-in — show before options so it is easy to discover */}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-slate-800",
              belowPaidHidden
                ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-800 dark:ring-amber-900/40"
                : "border-slate-200 hover:border-farumasi-200 dark:border-slate-700 dark:hover:border-farumasi-800",
            )}
          >
            <input
              type="checkbox"
              checked={includeBelowPaid}
              onChange={(e) => onIncludeBelowPaidChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-farumasi-600"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Also show lower-price pharmacies
                {(data?.below_paid_count ?? 0) > 0 && (
                  <span className="ml-1.5 font-bold text-amber-700 dark:text-amber-300">
                    ({data!.below_paid_count} available)
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Optional. Same medicines and rules as above, but cheaper than you paid — we cannot send change back.
                If you switch again later, we still compare against your original payment (
                {formatPrice(data?.amount_paid ?? 0)}).
              </p>
            </div>
          </label>

          {/* AI recommended — same price as original payment */}
          {(topPicks.length > 0 || samePriceOptions.length > 0) && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5 text-farumasi-600 dark:text-farumasi-400" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Best matches at your price
                </h2>
              </div>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Same total as you paid ({formatPrice(data?.amount_paid ?? 0)}) — all items in stock, open now
                {data?.options.some((o) => o.ai_reasons?.length) ? ", ranked by speed and distance" : ""}.
              </p>
              <div className="space-y-3">
                {(topPicks.length > 0 ? topPicks : samePriceOptions.slice(0, 3)).map((opt) => (
                  <PharmacyOptionCard
                    key={opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name}
                    opt={opt}
                    switchEnabled={switchEnabled}
                    reassigningId={reassigningId}
                    formatPrice={formatPrice}
                    onSelect={() => setConfirmOpt(opt)}
                    featured
                  />
                ))}
              </div>
            </section>
          )}

          {otherSamePrice.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">More at your price</h2>
              <div className="space-y-3">
                {otherSamePrice.map((opt) => (
                  <PharmacyOptionCard
                    key={opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name}
                    opt={opt}
                    switchEnabled={switchEnabled}
                    reassigningId={reassigningId}
                    formatPrice={formatPrice}
                    onSelect={() => setConfirmOpt(opt)}
                  />
                ))}
              </div>
            </section>
          )}

          {includeBelowPaid && lowerPriceOptions.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-bold text-slate-600 dark:text-slate-300">Lower-price options</h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Cheaper than your original payment — no refund of the difference.
              </p>
              <div className="space-y-3">
                {lowerPriceOptions.map((opt) => (
                  <PharmacyOptionCard
                    key={opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name}
                    opt={opt}
                    switchEnabled={switchEnabled}
                    reassigningId={reassigningId}
                    formatPrice={formatPrice}
                    onSelect={() => setConfirmOpt(opt)}
                    featured={opt.ai_rank != null && opt.ai_rank <= 3}
                  />
                ))}
              </div>
            </section>
          )}

          {includeBelowPaid && lowerPriceOptions.length === 0 && (data?.below_paid_count ?? 0) === 0 && switchEnabled && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No lower-price pharmacies matched your cart with the same rules (all medicines, open, insurance if applicable).
            </p>
          )}

          {viewOnly.length > 0 && (
            <section>
              <h2 className="mb-1 text-sm font-bold text-slate-600 dark:text-slate-300">Higher-priced matches</h2>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Shown for comparison — switching to these would require paying more (not available yet).
              </p>
              <div className="space-y-3 opacity-80">
                {viewOnly.map((opt) => (
                  <PharmacyOptionCard
                    key={opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name}
                    opt={opt}
                    switchEnabled={switchEnabled}
                    reassigningId={reassigningId}
                    formatPrice={formatPrice}
                    onSelect={() => {}}
                    disabled
                  />
                ))}
              </div>
            </section>
          )}

          {samePriceOptions.length === 0 &&
            lowerPriceOptions.length === 0 &&
            viewOnly.length === 0 &&
            !belowPaidHidden && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Store className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                No other pharmacies matched your items yet
              </p>
              <p className="mt-1 text-xs text-slate-500">Check back shortly — availability updates often.</p>
            </div>
          )}
        </div>
      )}

      {confirmOpt && (
        <ConfirmSwitchModal
          pharmacyName={pharmacyName}
          opt={confirmOpt}
          reassigningId={reassigningId}
          formatPrice={formatPrice}
          onClose={() => setConfirmOpt(null)}
          onConfirm={() => {
            onReassign(confirmOpt, confirmOpt.requires_no_change_ack === true);
            setConfirmOpt(null);
          }}
        />
      )}
    </>
  );
}

function PharmacyOptionCard({
  opt,
  switchEnabled,
  reassigningId,
  formatPrice,
  onSelect,
  featured,
  disabled,
}: {
  opt: ReassignmentOption;
  switchEnabled: boolean;
  reassigningId: string | null;
  formatPrice: (n: number) => string;
  onSelect: () => void;
  featured?: boolean;
  disabled?: boolean;
}) {
  const key = opt.pharmacy_id ?? opt.partner_company_id ?? opt.provider_name;
  const busy = reassigningId === key;
  const canTap = switchEnabled && !disabled && opt.can_switch !== false;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-800",
        featured ? "border-farumasi-200 ring-1 ring-farumasi-100 dark:border-farumasi-800 dark:ring-farumasi-900/40" : "border-slate-200 dark:border-slate-700",
        disabled && "grayscale",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white",
          featured ? "bg-farumasi-600" : "bg-slate-600 dark:bg-slate-500",
        )}>
          {featured && opt.ai_rank === 1 ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Store className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{opt.provider_name}</p>
            {opt.ai_rank != null && (
              <span className="rounded-full bg-farumasi-100 px-2 py-0.5 text-[10px] font-bold text-farumasi-800 dark:bg-farumasi-950/50 dark:text-farumasi-300">
                Top #{opt.ai_rank}
              </span>
            )}
            {opt.price_category === "within_paid" && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                No extra pay
              </span>
            )}
            {opt.price_category === "below_paid" && (opt.forfeit_amount ?? 0) > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                Save {formatPrice(opt.forfeit_amount!)} · no refund
              </span>
            )}
          </div>
          {opt.ai_reasons && opt.ai_reasons.length > 0 && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{opt.ai_reasons[0]}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Medicines {formatPrice(opt.estimated_subtotal)} · Delivery {formatPrice(opt.delivery_fee)}
          </p>
          {opt.price_category === "below_paid" && (opt.forfeit_amount ?? 0) > 0 && (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Lower price — no change back ({formatPrice(opt.forfeit_amount!)})
            </p>
          )}
          {opt.price_category === "above_paid" && (opt.extra_payment_required ?? 0) > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              +{formatPrice(opt.extra_payment_required!)} above your payment
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black text-farumasi-700 dark:text-emerald-300">{formatPrice(opt.estimated_total)}</p>
        </div>
      </div>
      {canTap ? (
        <button
          type="button"
          disabled={busy || reassigningId != null}
          onClick={onSelect}
          className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-farumasi-600 py-3.5 text-sm font-extrabold text-white hover:bg-farumasi-700 disabled:opacity-60 dark:border-slate-700"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
          {busy ? "Moving your order…" : `Choose ${opt.provider_name.split(" ")[0]}`}
        </button>
      ) : !switchEnabled ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs font-semibold text-slate-400 dark:border-slate-700">
          <Clock className="h-3.5 w-3.5" /> Available when the timer ends
        </div>
      ) : disabled || opt.can_switch === false ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs font-semibold text-slate-400 dark:border-slate-700">
          {opt.price_category === "above_paid"
            ? "Costs more than you paid — extra payment not supported yet"
            : "Not available for switching"}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmSwitchModal({
  pharmacyName,
  opt,
  reassigningId,
  formatPrice,
  onClose,
  onConfirm,
}: {
  pharmacyName: string;
  opt: ReassignmentOption;
  reassigningId: string | null;
  formatPrice: (n: number) => string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !reassigningId && onClose()} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-slate-400" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-farumasi-100 dark:bg-farumasi-950/50">
          <ArrowRightLeft className="h-6 w-6 text-farumasi-700 dark:text-farumasi-400" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Move to {opt.provider_name}?</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          We will ask <span className="font-bold">{opt.provider_name}</span> to confirm instead of{" "}
          <span className="font-bold">{pharmacyName}</span>. Same items, total {formatPrice(opt.estimated_total)}.
        </p>
        {opt.requires_no_change_ack && (opt.forfeit_amount ?? 0) > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This pharmacy is {formatPrice(opt.forfeit_amount!)} cheaper. You will not receive that difference back —
            you are okay proceeding without change.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border py-3 text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200">
            Not now
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-2xl bg-farumasi-600 py-3 text-sm font-bold text-white hover:bg-farumasi-700">
            Yes, move order
          </button>
        </div>
      </div>
    </div>
  );
}

/** Compact teaser for order tracking page — links to dedicated switch flow */
export function PharmacySwitchTeaser({
  pharmacyName,
  switchEnabled,
  optionCount,
  waitLabel,
  orderId,
}: {
  pharmacyName: string;
  switchEnabled: boolean;
  optionCount: number;
  waitLabel?: string | null;
  orderId: string;
}) {
  return (
    <a
      href={`/orders/${orderId}/switch-pharmacy`}
      className="group mb-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:border-farumasi-200 hover:bg-farumasi-50/50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-farumasi-800 dark:hover:bg-farumasi-950/20"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-farumasi-600 text-white shadow-sm">
        <Zap className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {switchEnabled ? "Want it faster?" : "Preview faster pharmacies"}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          {switchEnabled
            ? `${optionCount} AI-matched alternative${optionCount !== 1 ? "s" : ""} may confirm quicker than ${pharmacyName}.`
            : waitLabel
              ? `See options now — switch available in ${waitLabel} if ${pharmacyName} has not confirmed.`
              : `See AI-ranked pharmacies that can fulfill your order.`}
        </p>
      </div>
      <span className="shrink-0 text-xs font-bold text-farumasi-700 group-hover:underline dark:text-farumasi-400">
        Explore →
      </span>
    </a>
  );
}

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
      <span className="inline-flex items-center gap-1 rounded-full bg-farumasi-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
        <Zap className="h-3 w-3" />
        Faster options
      </span>
    );
  }
  if (waitLabel && waitMs != null && waitMs > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Clock className="h-3 w-3" />
        Preview · {waitLabel}
      </span>
    );
  }
  return null;
}
