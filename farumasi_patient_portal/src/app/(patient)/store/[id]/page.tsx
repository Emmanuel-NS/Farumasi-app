"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { productsService } from "@/lib/services/products.service";
import { useTranslation, tf } from "@/lib/translations";
import { useLanguageStore } from "@/store/language-store";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { toast } from "sonner";
import type { Medicine } from "@/types";
import {
  cartLineKey,
  lineUnitLabel,
  packagingLabel,
  type SellMode,
} from "@/lib/packaging-classes";
import { minQuantityForLine } from "@/lib/cart-pricing";
import { RichContent } from "@/components/shared/rich-content";
import {
  ArrowLeft, AlertCircle, ShoppingCart, Upload,
  CheckCircle, ExternalLink,
} from "lucide-react";

function labelingSourceHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function categoryBg(cat?: string): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50";
  if (c.includes("analgesic") || c.includes("pain"))
    return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/50";
  if (c.includes("malaria"))
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/50";
  if (c.includes("diabet") || c.includes("chronic"))
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/50";
  if (c.includes("vitamin") || c.includes("supplement"))
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800/50";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
    return "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/50";
  if (c.includes("gastro") || c.includes("digestive"))
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50";
  if (c.includes("hypertension"))
    return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50";
  if (c.includes("antihistamine") || c.includes("allergy"))
    return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/50";
  return "bg-farumasi-100 text-farumasi-700 border-farumasi-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50";
}

export default function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lang = useLanguageStore((s) => s.lang);
  const t = useTranslation();
  const [activeInfoTab, setActiveInfoTab] = useState<"overview" | "dosage" | "safety">("overview");
  const [sellMode, setSellMode] = useState<SellMode>("pack");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add: cartAdd, remove: cartRemove, items: cartItems } = useCartStore();
  const [med, setMed] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsService.getProductById(id)
      .then(setMed)
      .catch(() => setMed(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!med) return;
    const minQ = minQuantityForLine(med, sellMode);
    setQty((q) => Math.max(minQ, q));
  }, [sellMode, med?.id, med?.minPartialQuantity]);

  const lineKey = med ? cartLineKey(med.id, sellMode) : "";
  const minQty = med ? minQuantityForLine(med, sellMode) : 1;

  const selectSellMode = (mode: SellMode) => {
    if (!med) return;
    const key = cartLineKey(med.id, mode);
    if (mode === sellMode && (cartItems[key]?.qty ?? 0) > 0) {
      cartRemove(key);
      toast(`${med.name} removed from cart`, { icon: undefined });
      return;
    }
    setSellMode(mode);
    setQty(minQuantityForLine(med, mode));
  };

  if (loading) {
    return (
      <div className="p-6 text-center py-24">
        <div className="w-10 h-10 border-2 border-farumasi-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!med) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500 text-lg">Medicine not found.</p>
        <Link href="/store" className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 w-full max-w-6xl mx-auto min-w-0">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-farumasi-700 dark:hover:text-emerald-300 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </button>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Left: image */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 h-72 lg:h-80 flex items-center justify-center">
            {med.imageUrl ? (
              <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">💊</span>
            )}
          </div>
          {med.requiresPrescription && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3.5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Prescription Required</p>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                  A valid prescription is required. Upload yours to order.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-semibold text-farumasi-700 dark:text-emerald-300 bg-farumasi-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
              {med.category}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mb-2">{med.name}</h1>

          {med.manufacturer && (
            <p className="text-sm text-slate-500 mb-3">By <span className="font-medium text-slate-700">{med.manufacturer}</span></p>
          )}

          {med.packagingClass && (
            <p className="text-xs text-slate-500 mb-2">
              Packaging: <span className="font-medium text-slate-700">{packagingLabel(med.packagingClass)}</span>
            </p>
          )}

          {med.allowsPartialSelling ? (
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => selectSellMode("pack")}
                aria-pressed={sellMode === "pack"}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all",
                  sellMode === "pack"
                    ? "border-farumasi-500 bg-farumasi-50 text-farumasi-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-600"
                    : "border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-farumasi-200 dark:hover:border-emerald-700",
                )}
              >
                Whole pack
              </button>
              <button
                type="button"
                onClick={() => selectSellMode("partial")}
                aria-pressed={sellMode === "partial"}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all",
                  sellMode === "partial"
                    ? "border-farumasi-500 bg-farumasi-50 text-farumasi-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-600"
                    : "border-slate-100 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-farumasi-200 dark:hover:border-emerald-700",
                )}
              >
                By {med.partialUnitName ?? "unit"}
              </button>
            </div>
          ) : null}

          <p className="text-3xl font-extrabold text-farumasi-700 dark:text-emerald-300 mb-1">
            {(() => {
              if (sellMode === "partial") {
                const unit = med.partialUnitName ?? "unit";
                const from = med.unitPriceFrom;
                if (from == null) return "Per-unit price varies";
                return `${formatPrice(from)} / ${unit}`;
              }
              const min = med.price;
              const max = med.maxPrice ?? med.price;
              return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
            })()}
            <span className="text-sm font-medium text-slate-500 ml-1">
              per {lineUnitLabel(sellMode, med.partialUnitName, med.unitsPerPack)}
            </span>
          </p>
          {sellMode === "partial" && minQty > 1 && (
            <p className="text-xs text-slate-500 mb-2">
              Minimum order: {minQty} {med.partialUnitName ?? "units"}
            </p>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-slate-600">
              {sellMode === "partial"
                ? `How many ${med.partialUnitName ?? "units"}?`
                : "How many packs?"}
            </span>
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-2xl px-2 py-1" role="group" aria-label="Quantity">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(minQty, q - 1))}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 hover:bg-farumasi-50 dark:hover:bg-slate-600 shadow-sm"
              >
                −
              </button>
              <span className="text-sm font-bold w-6 text-center" aria-live="polite" aria-atomic="true">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="w-8 h-8 rounded-xl bg-farumasi-600 text-white flex items-center justify-center font-bold hover:bg-farumasi-700"
              >
                +
              </button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            {med.requiresPrescription ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    toast.error(tf(t.toast_rx_toast, { name: med.name }), { duration: 4000 });
                  }}
                  className="w-full h-12 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-900 font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <AlertCircle className="w-5 h-5" />
                  Prescription required
                </button>
                <Link
                  href="/prescriptions"
                  className="w-full h-12 rounded-2xl bg-farumasi-600 text-white font-bold hover:bg-farumasi-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload prescription to order
                </Link>
              </>
            ) : (
              <button
                onClick={() => {
                  cartAdd(med, qty, sellMode);
                  setAdded(true);
                  const unit = lineUnitLabel(sellMode, med.partialUnitName, med.unitsPerPack);
                  toast.success(`${med.name} ×${qty} ${unit} added to cart`);
                  setTimeout(() => setAdded(false), 2000);
                }}
                className={cn(
                  "w-full h-12 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2",
                  added ? "bg-farumasi-700 scale-[0.98]" : "bg-farumasi-600 hover:bg-farumasi-700"
                )}
              >
                {added ? (
                  <><CheckCircle className="w-5 h-5" /> Added to Cart {(cartItems[lineKey]?.qty ?? 0) > 0 ? `(×${cartItems[lineKey]?.qty})` : ""}</>
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Add to Cart {(cartItems[lineKey]?.qty ?? 0) > 0 ? `(×${cartItems[lineKey]?.qty} in cart)` : ""}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info sections */}
      <div className="mt-10 space-y-4">

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-[1fr_2fr] gap-4">

            {/* Left column */}
            <div className="space-y-4">

            {/* Patient Overview */}
            <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-100 p-5 space-y-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Patient Overview
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {med.shortDescription || med.description || "No description available."}
              </p>
              {med.dosageSummary && (
                <div className="bg-farumasi-50 dark:bg-emerald-950/40 rounded-xl px-3.5 py-2.5 border border-farumasi-100 dark:border-emerald-800/50">
                  <p className="text-[10px] font-bold text-farumasi-700 dark:text-emerald-300 mb-0.5 uppercase tracking-wide">
                    Dosage Guide
                  </p>
                  <p className="text-sm text-farumasi-800 dark:text-emerald-100">{med.dosageSummary}</p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-100 p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Product Details</p>
              <div className="space-y-2">
                {med.manufacturer && (
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Manufacturer</span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 break-words">{med.manufacturer}</span>
                  </div>
                )}
                {med.category && (
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Category</span>
                    <span className={cn("min-w-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border break-words", categoryBg(med.category))}>
                      {med.category}
                    </span>
                  </div>
                )}
                {med.subCategory && (
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Type</span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-700 capitalize break-words">{med.subCategory}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Prescription</span>
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                    med.requiresPrescription
                      ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/50"
                      : "bg-farumasi-50 text-farumasi-700 border-farumasi-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700/50",
                  )}>
                    {med.requiresPrescription ? "Required (Rx)" : "Not Required (OTC)"}
                  </span>
                </div>
                {med.composition && (
                  <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0 pt-0.5">Composition</span>
                    <span className="flex-1 min-w-0 text-[13px] text-slate-700 break-words">{med.composition}</span>
                  </div>
                )}
              </div>
            </div>

            </div>

            {/* Right: Detailed Information */}
            <div className="bg-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-100 p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
                Detailed Information
              </p>

              {/* Tab pills */}
              <div className="flex gap-1.5 mb-4">
                {(["overview", "dosage", "safety"] as const).map((t) => {
                  const has =
                    t === "overview" ? !!med.overviewDescription
                    : t === "dosage"  ? !!med.dosageDetails
                    : !!med.safetyInfo;
                  return (
                    <button
                      key={t}
                      onClick={() => has && setActiveInfoTab(t)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize",
                        activeInfoTab === t
                          ? "bg-farumasi-600 text-white shadow-sm"
                          : has
                          ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-default",
                      )}
                    >
                      {t === "dosage" ? "Dosage" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </div>

              {/* Rich HTML content */}
              <RichContent
                html={
                  activeInfoTab === "overview"
                    ? med.overviewDescription ||
                      "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No overview available.</p>"
                    : activeInfoTab === "dosage"
                    ? med.dosageDetails ||
                      "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No dosage details available.</p>"
                    : med.safetyInfo ||
                      "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No safety information available.</p>"
                }
              />

              {med.informationSourceUrl && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Labeling source
                  </p>
                  <a
                    href={med.informationSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-farumasi-700 dark:text-emerald-300 hover:underline break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    View official patient information leaflet
                    {labelingSourceHost(med.informationSourceUrl) && (
                      <span className="font-normal text-slate-400">
                        ({labelingSourceHost(med.informationSourceUrl)})
                      </span>
                    )}
                  </a>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Digital labeling is pharmacist-reviewed and supplementary to the physical pack insert.
                  </p>
                </div>
              )}
            </div>
        </div>

        {/* Dosage by Age */}
        {med.ageDosages && med.ageDosages.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Dosage by Age</p>
            {med.ageDosages.map((d, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{d.range}</p>
                </div>
                <p className="text-sm font-bold text-farumasi-700 dark:text-emerald-300">{d.instructions}</p>
              </div>
            ))}
          </div>
        )}


      </div>
    </div>
  );
}
