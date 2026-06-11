"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function RxInsuranceBanner({
  provider,
  discountPct,
  pharmacyMatch,
  className,
}: {
  provider: string;
  discountPct: number;
  /** When set, clarifies whether the selected pharmacy accepts this insurance. */
  pharmacyMatch?: boolean | null;
  className?: string;
}) {
  const matchKnown = pharmacyMatch != null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-2xl border px-4 py-3",
        matchKnown && pharmacyMatch === false
          ? "bg-amber-50 border-amber-100"
          : "bg-green-50 border-green-100",
        className,
      )}
    >
      <Shield
        className={cn(
          "w-4 h-4 shrink-0 mt-0.5",
          matchKnown && pharmacyMatch === false ? "text-amber-600" : "text-green-600",
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-xs font-semibold",
            matchKnown && pharmacyMatch === false ? "text-amber-800" : "text-green-700",
          )}
        >
          Insurance on your prescription
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          <span className="font-semibold text-slate-800">{provider}</span>
          {" — "}
          {discountPct}% coverage applied by your pharmacist
          {matchKnown && pharmacyMatch === false && (
            <span className="text-amber-800 font-medium">
              {" "}
              · Selected pharmacy does not accept this insurance (full price applies)
            </span>
          )}
          {matchKnown && pharmacyMatch === true && (
            <span className="text-green-700 font-medium">
              {" "}
              · Selected pharmacy accepts this insurance
            </span>
          )}
          {!matchKnown && (
            <span>
              {" "}
              · Discount applies only at pharmacies that accept {provider}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
