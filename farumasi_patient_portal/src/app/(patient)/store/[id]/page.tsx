"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { productsService, adaptProduct } from "@/lib/services/products.service";
import { pharmaciesService, type BackendListing, type BackendPharmacy } from "@/lib/services/pharmacies.service";
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
import {
  ArrowLeft, Star, AlertCircle, ShoppingCart, Upload,
  MapPin, CheckCircle, XCircle, Clock, ChevronRight,
} from "lucide-react";

function categoryBg(cat?: string): string {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic"))                              return "bg-blue-100 text-blue-700 border-blue-200";
  if (c.includes("analgesic") || c.includes("pain"))        return "bg-orange-100 text-orange-700 border-orange-200";
  if (c.includes("malaria"))                                 return "bg-red-100 text-red-700 border-red-200";
  if (c.includes("diabet") || c.includes("chronic"))        return "bg-purple-100 text-purple-700 border-purple-200";
  if (c.includes("vitamin") || c.includes("supplement"))    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (c.includes("respiratory") || c.includes("cold") || c.includes("asthma"))
                                                             return "bg-sky-100 text-sky-700 border-sky-200";
  if (c.includes("gastro") || c.includes("digestive"))      return "bg-amber-100 text-amber-700 border-amber-200";
  if (c.includes("hypertension"))                           return "bg-rose-100 text-rose-700 border-rose-200";
  if (c.includes("antihistamine") || c.includes("allergy")) return "bg-teal-100 text-teal-700 border-teal-200";
  return "bg-farumasi-100 text-farumasi-700 border-farumasi-200";
}

export default function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const lang = useLanguageStore((s) => s.lang);
  const [activeInfoTab, setActiveInfoTab] = useState<"overview" | "dosage" | "safety">("overview");
  const [sellMode, setSellMode] = useState<SellMode>("pack");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add: cartAdd, items: cartItems } = useCartStore();
  const [med, setMed] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [pharmacyMap, setPharmacyMap] = useState<Map<string, BackendPharmacy>>(new Map());

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsService.getProductById(id)
      .then(setMed)
      .catch(() => setMed(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    pharmaciesService.listingsForProduct(id).then((ls) => {
      setListings(ls);
      const pharmIds = [...new Set(ls.map((l) => l.pharmacy_id).filter(Boolean) as string[])];
      if (pharmIds.length === 0) return;
      pharmaciesService.listPharmacies(0, 100).then((pharmas) => {
        setPharmacyMap(new Map(pharmas.map((p) => [p.id, p])));
      });
    });
  }, [id]);

  useEffect(() => {
    if (!med) return;
    const minQ = minQuantityForLine(med, sellMode);
    setQty((q) => Math.max(minQ, q));
  }, [sellMode, med?.id, med?.minPartialQuantity]);

  const lineKey = med ? cartLineKey(med.id, sellMode) : "";
  const minQty = med ? minQuantityForLine(med, sellMode) : 1;
  const packPrices = listings.map((l) => l.price).filter((p) => p > 0);
  const partialPrices = listings
    .map((l) => l.unit_price)
    .filter((p): p is number => p != null && p > 0);

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
    <div className="p-4 lg:p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </button>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Left: image */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-slate-100 h-72 lg:h-80 flex items-center justify-center">
            {med.imageUrl ? (
              <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">💊</span>
            )}
          </div>
          {med.requiresPrescription && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Prescription Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  A valid prescription is required. Upload yours to order.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-semibold text-farumasi-700 bg-farumasi-50 px-3 py-1 rounded-full">
              {med.category}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{med.name}</h1>

          {med.manufacturer && (
            <p className="text-sm text-slate-500 mb-3">By <span className="font-medium text-slate-700">{med.manufacturer}</span></p>
          )}

          {med.rating && (
            <div className="flex items-center gap-1.5 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.round(med.rating!) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
              ))}
              <span className="text-sm font-semibold text-slate-700">{med.rating}</span>
            </div>
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
                onClick={() => setSellMode("pack")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all",
                  sellMode === "pack"
                    ? "border-farumasi-500 bg-farumasi-50 text-farumasi-800"
                    : "border-slate-100 text-slate-500 hover:border-farumasi-200",
                )}
              >
                Whole pack
              </button>
              <button
                type="button"
                onClick={() => setSellMode("partial")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 transition-all",
                  sellMode === "partial"
                    ? "border-farumasi-500 bg-farumasi-50 text-farumasi-800"
                    : "border-slate-100 text-slate-500 hover:border-farumasi-200",
                )}
              >
                By {med.partialUnitName ?? "unit"}
              </button>
            </div>
          ) : null}

          <p className="text-3xl font-extrabold text-farumasi-700 mb-1">
            {(() => {
              if (sellMode === "partial") {
                const prices = partialPrices.length > 0 ? partialPrices : (med.unitPriceFrom ? [med.unitPriceFrom] : []);
                if (prices.length === 0) return "Per-unit price varies";
                const min = Math.min(...prices), max = Math.max(...prices);
                const unit = med.partialUnitName ?? "unit";
                return min === max
                  ? `${formatPrice(min)} / ${unit}`
                  : `${formatPrice(min)} – ${formatPrice(max)} / ${unit}`;
              }
              const prices = packPrices.length > 0 ? packPrices : [med.price];
              const min = Math.min(...prices), max = Math.max(...prices);
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
            <div className="flex items-center gap-3 bg-slate-100 rounded-2xl px-2 py-1">
              <button onClick={() => setQty((q) => Math.max(minQty, q - 1))} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center font-bold text-slate-600 hover:bg-farumasi-50 shadow-sm">−</button>
              <span className="text-sm font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-xl bg-farumasi-600 text-white flex items-center justify-center font-bold hover:bg-farumasi-700">+</button>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
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
            {med.requiresPrescription && (
              <Link
                href="/prescriptions"
                className="w-full h-12 rounded-2xl border-2 border-farumasi-600 text-farumasi-700 font-bold hover:bg-farumasi-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Prescription
              </Link>
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
            <div className="bg-white rounded-3xl border border-slate-100 p-5 space-y-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Patient Overview
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {med.shortDescription || med.description || "No description available."}
              </p>
              {med.dosageSummary && (
                <div className="bg-farumasi-50 rounded-xl px-3.5 py-2.5 border border-farumasi-100">
                  <p className="text-[10px] font-bold text-farumasi-700 mb-0.5 uppercase tracking-wide">
                    Dosage Guide
                  </p>
                  <p className="text-sm text-farumasi-800">{med.dosageSummary}</p>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Product Details</p>
              <div className="space-y-2">
                {med.manufacturer && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Manufacturer</span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-800 break-words">{med.manufacturer}</span>
                  </div>
                )}
                {med.category && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Category</span>
                    <span className={cn("min-w-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border break-words", categoryBg(med.category))}>
                      {med.category}
                    </span>
                  </div>
                )}
                {med.subCategory && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Type</span>
                    <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-700 capitalize break-words">{med.subCategory}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                  <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0">Prescription</span>
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                    med.requiresPrescription
                      ? "bg-violet-50 text-violet-700 border-violet-200"
                      : "bg-farumasi-50 text-farumasi-700 border-farumasi-200",
                  )}>
                    {med.requiresPrescription ? "Required (Rx)" : "Not Required (OTC)"}
                  </span>
                </div>
                {med.composition && (
                  <div className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                    <span className="text-[11px] font-bold text-slate-400 w-24 shrink-0 pt-0.5">Composition</span>
                    <span className="flex-1 min-w-0 text-[13px] text-slate-700 break-words">{med.composition}</span>
                  </div>
                )}
              </div>
            </div>

            </div>

            {/* Right: Detailed Information */}
            <div className="bg-white rounded-3xl border border-slate-100 p-5">
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
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-slate-50 text-slate-300 cursor-default",
                      )}
                    >
                      {t === "dosage" ? "Dosage" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </div>

              {/* Rich HTML content */}
              <div
                className="rich-content"
                dangerouslySetInnerHTML={{
                  __html:
                    activeInfoTab === "overview"
                      ? med.overviewDescription ||
                        "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No overview available.</p>"
                      : activeInfoTab === "dosage"
                      ? med.dosageDetails ||
                        "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No dosage details available.</p>"
                      : med.safetyInfo ||
                        "<p style='color:#94a3b8;font-style:italic;font-size:0.875rem'>No safety information available.</p>",
                }}
              />
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
                <p className="text-sm font-bold text-farumasi-700">{d.instructions}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pharmacies */}
        {listings.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Available At</p>
            {listings.map((l) => {
              const name =
                l.partner_company?.name
                ?? l.pharmacy?.name
                ?? (l.pharmacy_id ? pharmacyMap.get(l.pharmacy_id)?.name : null)
                ?? "Seller";
              return (
                <div key={l.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-farumasi-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      {l.price > 0 && (
                        <p className="text-xs font-bold text-farumasi-700">RWF {l.price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {l.availability_status === "available" ? (
                      <><CheckCircle className="w-4 h-4 text-farumasi-500" /><span className="text-xs font-medium text-farumasi-700">In Stock</span></>
                    ) : l.availability_status === "low_stock" ? (
                      <><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-amber-700">Low Stock</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-400" /><span className="text-xs font-medium text-red-600">Out of Stock</span></>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
