"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  X, CheckCircle2, XCircle, MapPin, Shield, Pill,
  Star, CreditCard, Clock, Building2, ListOrdered,
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
  insuranceMatch: boolean;
  insuranceSaving: number;
  distanceKm: number;
  score: number;
  deliveryAvailable: boolean;
  estimatedDeliveryMin: number;
  priceRank: number;
  totalCandidates: number;
}

export interface MatchCriterion {
  key: string;
  label: string;
  met: boolean;
  note?: string;
}

const PATIENT_INSURANCE = "RSSB";

function roadDistanceKm(straightLineKm: number): number {
  return straightLineKm * 1.3;
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
  },
): MatchCriterion[] {
  const criteria: MatchCriterion[] = [];
  const fullStock = opt.availableCount === opt.totalCount;

  criteria.push({
    key: "rank",
    label: "Overall AI match",
    met: opt.rank === 1,
    note:
      opt.rank === 1
        ? `Top pick of ${allOptions.length}`
        : `#${opt.rank} of ${allOptions.length} shown`,
  });

  criteria.push({
    key: "stock",
    label: "All medicines in stock",
    met: fullStock,
    note: fullStock
      ? `${opt.totalCount}/${opt.totalCount} items`
      : `${opt.availableCount}/${opt.totalCount} available`,
  });

  const priceRank =
    [...allOptions]
      .sort((a, b) => a.priceEstimate - b.priceEstimate)
      .findIndex((o) => o.codename === opt.codename) + 1;

  criteria.push({
    key: "price",
    label: "Medicine total price",
    met: priceRank === 1,
    note:
      priceRank === 1
        ? `Lowest of ${allOptions.length} (${formatPrice(opt.priceEstimate)})`
        : `${ordinal(priceRank)} of ${allOptions.length} · ${formatPrice(opt.priceEstimate)}`,
  });

  if (opt.totalCandidates > allOptions.length) {
    criteria.push({
      key: "price_pool",
      label: "Price among all matching pharmacies",
      met: opt.priceRank === 1,
      note: `${ordinal(opt.priceRank)} of ${opt.totalCandidates} pharmacies with your items`,
    });
  }

  if (ctx.patientLocation || ctx.patientDistrict) {
    const isNearest =
      opt.distanceKm > 0 &&
      allOptions.every(
        (o) =>
          o.codename === opt.codename ||
          o.distanceKm === 0 ||
          o.distanceKm >= opt.distanceKm,
      );
    const roadKm =
      ctx.patientLocation && opt.distanceKm > 0
        ? roadDistanceKm(opt.distanceKm)
        : 0;

    criteria.push({
      key: "proximity",
      label: "Near your location",
      met: isNearest || (opt.distanceKm > 0 && opt.distanceKm < 10),
      note: roadKm > 0
        ? isNearest
          ? `Nearest · ${roadKm.toFixed(1)} km road distance`
          : `${roadKm.toFixed(1)} km road distance`
        : opt.pharmacy.district || "District-based estimate",
    });
  }

  criteria.push({
    key: "insurance",
    label: `Accepts ${PATIENT_INSURANCE} insurance`,
    met: opt.insuranceMatch,
    note: opt.insuranceMatch
      ? `Est. savings ${formatPrice(opt.insuranceSaving)}`
      : "Not accepted at this pharmacy",
  });

  criteria.push({
    key: "open",
    label: "Open now",
    met: opt.pharmacy.isOpen,
    note: opt.pharmacy.isOpen ? "Ready to fulfill" : "Currently closed",
  });

  if (ctx.fulfillment === "delivery") {
    const isFastest = allOptions.every(
      (o) => o.estimatedDeliveryMin >= opt.estimatedDeliveryMin,
    );
    criteria.push({
      key: "delivery",
      label: "Delivery speed estimate",
      met: isFastest,
      note: `~${opt.estimatedDeliveryMin} min total`,
    });
  } else {
    const travelMin =
      opt.distanceKm > 0 ? Math.round((opt.distanceKm / 25) * 60) : 0;
    criteria.push({
      key: "pickup",
      label: "Convenient for pickup",
      met: opt.distanceKm > 0 && opt.distanceKm < 15,
      note:
        opt.distanceKm > 0
          ? `~${travelMin} min drive · ${roadDistanceKm(opt.distanceKm).toFixed(1)} km`
          : opt.pharmacy.district,
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
  onClose,
}: {
  option: PharmacyOption | null;
  allOptions: PharmacyOption[];
  fulfillment: "delivery" | "pickup";
  patientLocation: [number, number] | null;
  patientDistrict: string;
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
  });
  const img = sellerImageSrc({ image_url: option.pharmacy.imageUrl });
  const roadKm =
    patientLocation && option.distanceKm > 0
      ? roadDistanceKm(option.distanceKm)
      : 0;
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
                {roadKm > 0 && ` · ${roadKm.toFixed(1)} km`}
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
                {Math.round(
                  (option.score / (allOptions[0]?.score || option.score)) * 100,
                )}
                %
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-farumasi-400 to-farumasi-600"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (option.score / (allOptions[0]?.score || option.score)) * 100,
                    ),
                  )}%`,
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
            {option.insuranceMatch && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                <Shield className="w-3 h-3" /> {PATIENT_INSURANCE}
              </span>
            )}
            {option.pharmacy.isOpen && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                <Building2 className="w-3 h-3" /> Open
              </span>
            )}
            {fulfillment === "delivery" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> ~{option.estimatedDeliveryMin} min
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
