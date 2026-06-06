"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Calculator, Percent, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatRWF } from "@/lib/utils";

export interface CommissionProfile {
  commission_rate_percent?: number | null;
  effective_commission_rate_percent?: number | null;
  commission_rate_source?: string | null;
}

function formatRatePercent(rate: number): string {
  const rounded = Math.round(rate * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
}

export function resolveEffectiveCommission(profile: CommissionProfile | null | undefined): number {
  if (!profile) return 10;
  if (profile.effective_commission_rate_percent != null) {
    return profile.effective_commission_rate_percent;
  }
  if (profile.commission_rate_percent != null) {
    return profile.commission_rate_percent;
  }
  return 10;
}

export function isCustomCommission(profile: CommissionProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.commission_rate_source) {
    return profile.commission_rate_source === "custom";
  }
  return profile.commission_rate_percent != null;
}

interface Props {
  profile: CommissionProfile | null;
  pendingRateChange?: string | null;
  className?: string;
}

export function BusinessProfileCommissionCard({
  profile,
  pendingRateChange,
  className,
}: Props) {
  const rate = resolveEffectiveCommission(profile);
  const rateLabel = formatRatePercent(rate);
  const custom = isCustomCommission(profile);

  const exampleSubtotal = 50_000;
  const exampleCommission = Math.round(exampleSubtotal * (rate / 100));
  const exampleNet = exampleSubtotal - exampleCommission;

  return (
    <Card className={cn("overflow-hidden border-farumasi-200 shadow-md", className)}>
      <div className="bg-gradient-to-br from-farumasi-600 via-farumasi-700 to-emerald-900 px-5 py-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-farumasi-100 text-xs font-semibold uppercase tracking-wider">
              <Percent className="w-3.5 h-3.5" />
              Your commission agreement
            </div>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold tabular-nums leading-none">{rateLabel}</span>
              <span className="text-2xl font-bold pb-1">%</span>
            </div>
            <p className="text-sm text-farumasi-50/90 max-w-md">
              Applied <strong className="text-white">once per order</strong> on product subtotal before delivery fees.
              Withdrawals use your net balance — no second commission on payout.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                custom
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-white/10 border-white/20 text-farumasi-50",
              )}
            >
              {custom ? (
                <>
                  <BadgeCheck className="w-3.5 h-3.5" /> Custom agreement
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Platform default rate
                </>
              )}
            </span>
            {profile?.commission_rate_percent != null && custom && (
              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] text-farumasi-50">
                Stored: {formatRatePercent(profile.commission_rate_percent)}%
              </span>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-5 space-y-4 bg-white">
        {pendingRateChange && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Commission change awaiting your approval</p>
            <p className="text-xs mt-1 text-amber-800">
              FARUMASI proposed <strong>{pendingRateChange}%</strong>. Your current rate of{" "}
              <strong>{rateLabel}%</strong> stays active until you approve in Requests.
            </p>
            <Button size="sm" variant="outline" className="mt-3 h-8 text-xs" asChild>
              <Link href="/requests?tab=inbox">
                Review in Requests <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
            <Calculator className="w-3.5 h-3.5 text-farumasi-600" />
            Example on a {formatRWF(exampleSubtotal)} order
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Product subtotal</span>
              <span className="font-medium text-slate-900">{formatRWF(exampleSubtotal)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>FARUMASI commission ({rateLabel}%)</span>
              <span className="font-medium">−{formatRWF(exampleCommission)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-farumasi-700">
              <span>Your net earnings</span>
              <span>{formatRWF(exampleNet)}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Only FARUMASI admins can change your commission rate. Any update is sent to{" "}
          <Link href="/requests?tab=inbox" className="text-farumasi-600 font-medium hover:underline">
            Requests → Inbox
          </Link>{" "}
          for your confirmation before it applies to new orders.
        </p>
      </CardContent>
    </Card>
  );
}
