"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  X, CheckCircle2, XCircle, MapPin, Shield, Pill,
  Star, CreditCard, Building2, ListOrdered, Truck,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { sellerImageSrc } from "@/lib/services/pharmacies.service";
import type { Pharmacy } from "@/types";

export interface MedicineAvailability {
  medicineName: string;
  available: boolean;
  stockStatus: string;
  unitPrice: number;
}

export interface PharmacyOption {
  pharmacy: Pharmacy;
  rank: 1 | 2 | 3;
  codename: "A" | "B" | "C";
  availability: MedicineAvailability[];
  availableCount: number;
  totalCount: number;
  priceEstimate: number;
  /** Medicine subtotal after Rx insurance (same as priceEstimate when pharmacy does not accept insurance). */
  priceAfterInsurance: number;
  insuranceMatch: boolean;
  insuranceSaving: number;
  /** Pharmacist applied insurance on this Rx (regardless of pharmacy acceptance). */
  rxHasInsurance?: boolean;
  distanceKm: number;
  roadDistanceKm: number;
  /** True when road distance came from OSRM routing API. */
  roadDistanceFromRouting?: boolean;
  score: number;
  maxScore: number;
  matchPercent: number;
  deliveryAvailable: boolean;
  priceRank: number;
  /** Rank among pharmacies that have every cart item (fair price compare) */
  fullStockPriceRank: number;
  comparesOnFullStockPrice: boolean;
  distanceRank: number;
  totalCandidates: number;
  /** Prescription-only: pharmacist applied insurance on this Rx */
  rxInsuranceActive?: boolean;
}

export interface MatchCriterion {
  key: string;
  label: string;
  met: boolean;
  note?: string;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function buildMatchCriteria(
  opt: PharmacyOption,
  allOptions: PharmacyOption[],
  ctx: {
    fulfillment: "delivery" | "pickup";
    patientLocation: [number, number] | null;
    patientDistrict: string;
    rxInsuranceProvider?: string | null;
    rxInsuranceDiscountPct?: number | null;
    deliveryFee?: number;
  },
): MatchCriterion[] {
  const criteria: MatchCriterion[] = [];
  const fullStock = opt.availableCount === opt.totalCount;

  criteria.push({
    key: "rank",
    label: "Overall match rank",
    met: opt.rank === 1,
    note:
      opt.rank === 1
        ? `Top pick of ${allOptions.length} shown`
        : `#${opt.rank} of ${allOptions.length} shown · ${opt.matchPercent}% fit`,
  });

  criteria.push({
    key: "stock",
    label: "All medicines in stock",
    met: fullStock,
    note: fullStock
      ? `${opt.totalCount}/${opt.totalCount} items`
      : `${opt.availableCount}/${opt.totalCount} available`,
  });

  const fullStockPeers = allOptions.filter((o) => o.availableCount === o.totalCount);

  if (fullStock) {
    const rankAmongFull =
      opt.fullStockPriceRank > 0 ? opt.fullStockPriceRank : fullStockPeers.length;
    criteria.push({
      key: "price",
      label: "Medicine subtotal (full-stock pharmacies only)",
      met: rankAmongFull === 1 && fullStockPeers.length > 1,
      note:
        fullStockPeers.length <= 1
          ? `Only pharmacy with all ${opt.totalCount} items · ${formatPrice(opt.priceEstimate)}`
          : rankAmongFull === 1
            ? `Lowest among ${fullStockPeers.length} with full stock · ${formatPrice(opt.priceEstimate)}`
            : `${ordinal(rankAmongFull)} of ${fullStockPeers.length} full-stock · ${formatPrice(opt.priceEstimate)}`,
    });
  } else {
    criteria.push({
      key: "price",
      label: "Medicine subtotal (full-stock pharmacies only)",
      met: false,
      note: `${opt.availableCount}/${opt.totalCount} items — price not compared to full-stock pharmacies`,
    });
  }

  if (ctx.patientLocation || ctx.patientDistrict) {
    const roadKm = opt.roadDistanceKm > 0 ? opt.roadDistanceKm : 0;
    const hasDistanceRank = opt.distanceRank > 0 && opt.totalCandidates > 0;

    criteria.push({
      key: "proximity",
      label: "Distance rank",
      met: hasDistanceRank && opt.distanceRank === 1,
      note: roadKm > 0
        ? hasDistanceRank
          ? `${ordinal(opt.distanceRank)} nearest of ${opt.totalCandidates} · ${roadKm.toFixed(1)} km road${opt.roadDistanceFromRouting ? "" : " (est.)"}`
          : `~${roadKm.toFixed(1)} km ${opt.roadDistanceFromRouting ? "road" : "est. road"} distance`
        : opt.pharmacy.district
          ? `Same district: ${opt.pharmacy.district} (enable GPS for km)`
          : "Enable location for distance ranking",
    });
  }

  if (ctx.rxInsuranceProvider && ctx.rxInsuranceDiscountPct) {
    criteria.push({
      key: "insurance",
      label: "Accepts prescription insurance",
      met: opt.insuranceMatch,
      note: opt.insuranceMatch
        ? `${ctx.rxInsuranceProvider} accepted · ${ctx.rxInsuranceDiscountPct}% off medicines (−${formatPrice(opt.insuranceSaving)})`
        : `Does not accept ${ctx.rxInsuranceProvider} — full price ${formatPrice(opt.priceEstimate)}`,
    });
  }

  criteria.push({
    key: "open",
    label: "Open now (high priority)",
    met: opt.pharmacy.isOpen,
    note: opt.pharmacy.isOpen ? "Ready to fulfill" : "Currently closed — ranked lower",
  });

  criteria.push({
    key: "weights",
    label: "How match % is calculated",
    met: true,
    note:
      "Priority: stock & open → insurance (Rx only) → distance & full-stock price (equal weight)",
  });

  if (ctx.fulfillment === "delivery" && ctx.deliveryFee != null && ctx.deliveryFee > 0) {
    criteria.push({
      key: "delivery_fee",
      label: "Estimated delivery fee",
      met: true,
      note: `${formatPrice(ctx.deliveryFee)} based on road distance to your address`,
    });
  }

  return criteria;
}

export function PharmacyMatchDetails({
  option,
  allOptions,
  fulfillment,
  patientLocation,
  patientDistrict,
  rxInsuranceProvider,
  rxInsuranceDiscountPct,
  deliveryFee,
  onClose,
}: {
  option: PharmacyOption | null;
  allOptions: PharmacyOption[];
  fulfillment: "delivery" | "pickup";
  patientLocation: [number, number] | null;
  patientDistrict: string;
  rxInsuranceProvider?: string | null;
  rxInsuranceDiscountPct?: number | null;
  deliveryFee?: number;
  onClose: () => void;
}) {
  const t = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!option) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [option, onClose]);

  if (!mounted || !option) return null;

  const criteria = buildMatchCriteria(option, allOptions, {
    fulfillment,
    patientLocation,
    patientDistrict,
    rxInsuranceProvider,
    rxInsuranceDiscountPct,
    deliveryFee,
  });
  const img = sellerImageSrc({ image_url: option.pharmacy.imageUrl });
  const roadKm = option.roadDistanceKm > 0 ? option.roadDistanceKm : 0;
  const priceRank =
    [...allOptions]
      .sort((a, b) => a.priceEstimate - b.priceEstimate)
      .findIndex((o) => o.codename === option.codename) + 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pharmacy-match-details-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden",
                !img && "bg-farumasi-600 text-white font-black",
              )}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="w-full h-full object-cover" />
              ) : (
                option.codename
              )}
            </div>
            <div className="min-w-0">
              <h2
                id="pharmacy-match-details-title"
                className="text-base font-bold text-slate-900 truncate"
              >
                {t.cart_pharmacy_label} {option.codename}
                {option.rank === 1 && (
                  <span className="ml-2 text-[10px] font-bold bg-farumasi-600 text-white px-2 py-0.5 rounded-full align-middle">
                    {t.cart_best_match}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                {option.pharmacy.district}
                {roadKm > 0 && ` · ~${roadKm.toFixed(1)} km est. road`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          {/* Match score */}
          <div className="bg-farumasi-50 border border-farumasi-100 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-farumasi-800 uppercase tracking-wide">
                {t.cart_match_score}
              </span>
              <span className="text-sm font-extrabold text-farumasi-700 tabular-nums">
                {option.matchPercent}%
              </span>
            </div>
            <p className="text-[10px] text-farumasi-700/80 mb-2">
              Stock &amp; open first · insurance (Rx) · then distance &amp; price (equal, price only when all items in stock).
            </p>
            <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-farumasi-400 to-farumasi-600"
                style={{
                  width: `${Math.min(100, option.matchPercent)}%`,
                }}
              />
            </div>
          </div>

          {/* Products & prices */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4 text-farumasi-600" />
              {t.cart_products_prices}
            </h3>
            <ul className="space-y-2">
              {option.availability.map((med, i) => (
                <li
                  key={`${med.medicineName}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {med.available ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {med.medicineName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-bold shrink-0 tabular-nums",
                      med.available ? "text-slate-900" : "text-slate-400",
                    )}
                  >
                    {med.available ? formatPrice(med.unitPrice) : t.cart_not_available}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 text-sm">
              <span className="text-slate-500">{t.cart_subtotal}</span>
              <span className="font-extrabold text-farumasi-700">
                {formatPrice(option.priceEstimate)}
              </span>
            </div>
            {option.insuranceMatch && option.insuranceSaving > 0 && rxInsuranceProvider && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  {rxInsuranceProvider} ({rxInsuranceDiscountPct}% off)
                </span>
                <span className="font-bold">−{formatPrice(option.insuranceSaving)}</span>
              </div>
            )}
            {option.insuranceMatch && option.insuranceSaving > 0 && (
              <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                <span>You pay (medicines)</span>
                <span className="text-farumasi-700">{formatPrice(option.priceAfterInsurance)}</span>
              </div>
            )}
            {!option.insuranceMatch && option.rxHasInsurance && rxInsuranceProvider && (
              <p className="text-xs text-amber-700 mt-2">
                Full price — this pharmacy does not accept {rxInsuranceProvider}.
              </p>
            )}
          </section>

          {/* Why recommended */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <ListOrdered className="w-4 h-4 text-farumasi-600" />
              {t.cart_why_recommended}
            </h3>
            <ul className="space-y-2">
              {criteria.map((c) => (
                <li
                  key={c.key}
                  className={cn(
                    "flex items-start gap-2.5 rounded-xl px-3 py-2.5 border",
                    c.met
                      ? "bg-green-50/80 border-green-100"
                      : "bg-slate-50 border-slate-100",
                  )}
                >
                  {c.met ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        c.met ? "text-green-900" : "text-slate-600",
                      )}
                    >
                      {c.label}
                    </p>
                    {c.note && (
                      <p className="text-xs text-slate-500 mt-0.5">{c.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Quick badges summary */}
          <div className="flex flex-wrap gap-2">
            {option.rank === 1 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-farumasi-100 text-farumasi-800 px-2.5 py-1 rounded-full">
                <Star className="w-3 h-3" /> {t.cart_best_match}
              </span>
            )}
            {option.insuranceMatch && rxInsuranceProvider && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Accepts {rxInsuranceProvider}
              </span>
            )}
            {!option.insuranceMatch && option.rxHasInsurance && rxInsuranceProvider && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" /> Full price — no {rxInsuranceProvider}
              </span>
            )}
            {option.pharmacy.isOpen && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                <Building2 className="w-3 h-3" /> Open
              </span>
            )}
            {fulfillment === "delivery" && deliveryFee != null && deliveryFee > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full">
                <Truck className="w-3 h-3" /> +{formatPrice(deliveryFee)} delivery
              </span>
            )}
            {priceRank === 1 && option.rank !== 1 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                <CreditCard className="w-3 h-3" /> {t.cart_best_value}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors"
          >
            {t.cart_close_details}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
