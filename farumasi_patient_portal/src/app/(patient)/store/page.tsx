"use client";

import { useState, useMemo, useRef, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguageStore } from "@/store/language-store";
import { cn, formatPrice } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
import { useCartStore } from "@/store/cart-store";
import type { Medicine, Recommendation } from "@/types";
import { toast } from "sonner";
import { useTranslation, tf } from "@/lib/translations";
import { productsService } from "@/lib/services/products.service";
import { prescriptionsService } from "@/lib/services/prescriptions.service";
import { recommendationsService } from "@/lib/services/recommendations.service";
import { ordersService } from "@/lib/services/orders.service";
import { pharmaciesService, BackendPharmacy } from "@/lib/services/pharmacies.service";
import { getPatientCoords } from "@/lib/location";
import type { DigitalPrescription } from "@/types";
import {
  SlidersHorizontal,
  ShoppingCart,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  CheckCircle,
  LayoutGrid,
  Pill,
  Plus,
  Minus,
} from "lucide-react";
import {
  cartLineKey,
  lineUnitLabel,
  type SellMode,
} from "@/lib/packaging-classes";
import { minQuantityForLine } from "@/lib/cart-pricing";
import { HEALTHCARE_CATEGORY_ICONS, IconGeneral } from "@/components/icons/CategoryIcons";
import type { CategoryIconComponent } from "@/components/icons/CategoryIcons";

// ── Category → custom icon resolution ───────────────────────────────────────
const _ICON_BY_NAME: Record<string, CategoryIconComponent> = Object.fromEntries(
  HEALTHCARE_CATEGORY_ICONS.map(({ name, Icon }) => [name, Icon]),
);

function getDefaultIconKey(catName: string): string {
  const n = catName.toLowerCase();
  if (n.includes("analgesic") || n.includes("pain"))           return "pain-relief";
  if (n.includes("antibiotic"))                                return "antibiotics";
  if (n.includes("antidiabet") || n.includes("diabet"))        return "diabetes";
  if (n.includes("antihypertens") || n.includes("hypertens"))  return "blood-pressure";
  if (n.includes("malaria"))                                   return "infectious";
  if (n.includes("antihistamine") || n.includes("histamine"))  return "allergy";
  if (n.includes("gastro") || n.includes("digestive"))         return "digestive";
  if (n.includes("respiratory") || n.includes("lung"))         return "respiratory";
  if (n.includes("vitamin"))                                   return "vitamins";
  if (n.includes("supplement"))                                return "supplements";
  if (n.includes("cold") || n.includes("flu"))                 return "cold-flu";
  if (n.includes("allergy") || n.includes("asthma"))           return "allergy";
  if (n.includes("chronic"))                                   return "chronic-care";
  if (n.includes("personal care") || n.includes("beauty"))     return "skincare";
  if (n.includes("first aid"))                                 return "first-aid";
  if (n.includes("hygiene"))                                   return "wound-care";
  if (n.includes("nutrition"))                                 return "nutrition";
  if (n.includes("sleep"))                                     return "sleep";
  if (n.includes("mental") || n.includes("neuro"))             return "mental-health";
  if (n.includes("baby") || n.includes("child") || n.includes("pedia")) return "pediatrics";
  if (n.includes("mother"))                                    return "mother-baby";
  if (n.includes("skin") || n.includes("derma"))               return "skincare";
  if (n.includes("eye") || n.includes("ophthalm"))             return "eye-care";
  if (n.includes("ear"))                                       return "ear-care";
  if (n.includes("dental") || n.includes("oral"))              return "dental";
  if (n.includes("cardiac") || n.includes("heart"))            return "heart-health";
  if (n.includes("oncol") || n.includes("cancer"))             return "cancer-care";
  if (n.includes("kidney") || n.includes("renal"))             return "kidney";
  if (n.includes("liver") || n.includes("hepat"))              return "liver";
  if (n.includes("bone") || n.includes("ortho"))               return "bone-joint";
  if (n.includes("thyroid"))                                   return "thyroid";
  if (n.includes("mobility") || n.includes("wheelchair"))      return "mobility";
  if (n.includes("device"))                                    return "devices";
  if (n.includes("sexual"))                                    return "sexual-health";
  if (n.includes("women") || n.includes("female"))             return "womens-health";
  if (n.includes("men") || n.includes("male"))                 return "mens-health";
  if (n.includes("others") || n.includes("general"))           return "general";
  return "general";
}

function getCategoryIcon(cat: string): CategoryIconComponent {
  return _ICON_BY_NAME[getDefaultIconKey(cat)] ?? IconGeneral;
}

export default function StorePage() {
  return (
    <Suspense>
      <StorePageInner />
    </Suspense>
  );
}

function StorePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prescriptionId = searchParams.get("prescription");

  // ── Real data from backend ────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [backendCategories, setBackendCategories] = useState<{ name: string; icon_name: string }[]>([]);
  const [activePrescription, setActivePrescription] = useState<DigitalPrescription | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recIsFallbackLocation, setRecIsFallbackLocation] = useState(false);
  const [orderingRecId, setOrderingRecId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      productsService.getAllProducts(),
      productsService.getCategories(),
    ]).then(([prods, cats]) => {
      setMedicines(prods);
      // Count products per category — a product may belong to multiple (comma-separated)
      const countMap: Record<string, number> = {};
      for (const p of prods) {
        for (const cat of p.category.split(",").map((s) => s.trim()).filter(Boolean)) {
          countMap[cat] = (countMap[cat] ?? 0) + 1;
        }
      }
      const sorted = cats
        .map((c) => ({ name: c.name, icon_name: c.icon_name }))
        .sort((a, b) => (countMap[b.name] ?? 0) - (countMap[a.name] ?? 0));
      setBackendCategories(sorted);
    }).catch(() => toast.error("Failed to load products")).finally(() => setLoadingProducts(false));
    // Load pharmacies and filter to only those with at least one available product in stock
    Promise.all([
      pharmaciesService.listPharmacies(0, 200),
      pharmaciesService.listActivePharmacyIds(),
    ]).then(([all, activeIds]) => {
      setPharmacies(all.filter((p) => activeIds.has(p.id)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!prescriptionId) return;
    prescriptionsService.getMyPrescriptions().then((rxList) => {
      const match = rxList.find((rx) => rx.id === prescriptionId) ?? null;
      setActivePrescription(match);
    }).catch(() => {});
  }, [prescriptionId]);

  // Phase 11.2: fetch real pharmacy recommendations when a prescription is selected.
  useEffect(() => {
    if (!prescriptionId) {
      setRecommendations([]);
      setRecError(null);
      return;
    }
    const { coords, isFallback } = getPatientCoords();
    setRecIsFallbackLocation(isFallback);
    setRecLoading(true);
    setRecError(null);
    recommendationsService
      .getForPrescription(prescriptionId, { lat: coords.lat, lon: coords.lon })
      .then((res) => setRecommendations(res.topRecommendations))
      .catch(() => setRecError("Could not load pharmacy recommendations. Please try again."))
      .finally(() => setRecLoading(false));
  }, [prescriptionId]);

  async function handleOrderFromRecommendation(rec: Recommendation) {
    if (!prescriptionId || !rec.id) {
      toast.error("This recommendation is no longer valid. Please reload.");
      return;
    }
    setOrderingRecId(rec.id);
    try {
      const order = await ordersService.createFromRecommendation({
        prescriptionId,
        recommendationId: rec.id,
        deliveryMethod: "delivery",
      });
      toast.success(`Order placed with ${rec.providerName}`);
      router.push(`/orders/${order.id}`);
    } catch {
      toast.error("Could not create order. The recommendation may have expired.");
    } finally {
      setOrderingRecId(null);
    }
  }

  // ── Search from topbar via Zustand — mirrors Flutter StateService searchQuery ──
  const { query } = useSearchStore();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);

  // Category label lookup using current language
  const getCatLabel = (cat: string): string => {
    const map: Record<string, string> = {
      "All": t.cat_all, "Pain Relief": t.cat_pain_relief, "Antibiotics": t.cat_antibiotics,
      "Vitamins": t.cat_vitamins, "Cold & Flu": t.cat_cold_flu, "Skincare": t.cat_skincare,
      "Hygiene": t.cat_hygiene, "Nutrition": t.cat_nutrition, "Sexual Health": t.cat_sexual_health,
      "Mobility Aids": t.cat_mobility_aids, "Mother & Baby": t.cat_mother_baby,
      "Devices": t.cat_devices, "First Aid": t.cat_first_aid, "Chronic Care": t.cat_chronic_care,
      "Diabetes": t.cat_diabetes, "Allergy": t.cat_allergy, "Malaria": t.cat_malaria,
      "Digestive Health": t.cat_digestive, "Others": t.cat_others,
    };
    return map[cat] ?? cat;
  };

  // ── Multi-select categories — mirrors Flutter Set<String> _selectedCategories ──
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sort, setSort]       = useState<"default" | "price_asc" | "price_desc">("default");
  const PRODUCT_TYPES = [
    { value: "medicine",         label: "Medicine" },
    { value: "medical_device",   label: "Medical Device" },
    { value: "food_supplements", label: "Food Supplements" },
    { value: "cosmetics",        label: "Cosmetics" },
  ] as const;
  const [selectedProductType, setSelectedProductType] = useState<string>("All");
  const { items: cartItems, add: cartAdd, remove: cartRemove } = useCartStore();
  const [quickView, setQuickView] = useState<Medicine | null>(null);
  const [quickAdd, setQuickAdd]   = useState<Medicine | null>(null);
  const [quickAddMode, setQuickAddMode] = useState<SellMode>("pack");
  const [quickAddQty, setQuickAddQty]   = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [hideCategories, setHideCategories] = useState(false);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const onCatMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    dragState.current = { isDragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  };
  const onCatMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = categoryScrollRef.current;
    if (!el || !dragState.current.isDragging) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  };
  const onCatMouseUp = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    dragState.current.isDragging = false;
    el.style.cursor = "";
    el.style.userSelect = "";
    updateScrollState();
  };
  // Pharmacy filter — mirrors Flutter PharmacyDetailScreen navigation
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [pharmacies, setPharmacies] = useState<BackendPharmacy[]>([]);
  // product_id → { price, status } for the currently selected pharmacy
  const [pharmacyListings, setPharmacyListings] = useState<Map<string, { price: number; status: string }>>(new Map());

  // Fetch listings for selected pharmacy so we can filter products to what's available there.
  // This useEffect MUST be declared after selectedPharmacyId / setPharmacyListings are initialized.
  useEffect(() => {
    if (!selectedPharmacyId) {
      setPharmacyListings(new Map());
      return;
    }
    pharmaciesService.listingsForPharmacy(selectedPharmacyId).then((listings) => {
      const map = new Map(listings.map((l) => [l.product_id, { price: l.price, status: l.availability_status }]));
      setPharmacyListings(map);
    }).catch(() => {});
  }, [selectedPharmacyId]);

  // Toggle category — clicking "All" clears all; clicking active deselects; clicking inactive adds
  function toggleCategory(cat: string) {
    if (cat === "All") { setSelectedCategories(new Set()); return; }
    const norm = cat.toLowerCase();
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(norm)) next.delete(norm); else next.add(norm);
      return next;
    });
  }

  // Update arrow visibility on scroll
  const updateScrollState = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scrollCategories = (dir: "left" | "right") => {
    const el = categoryScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    setTimeout(updateScrollState, 350);
  };

  // ── Filtered list — mirrors Flutter's build filtering logic ──────────────
  const filtered = useMemo(() => {
    let list = [...medicines];
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.description?.toLowerCase().includes(q) ?? false)
      );
    }
    if (selectedCategories.size > 0) {
      // A product may belong to multiple categories (comma-separated string)
      // Match if ANY of its categories is in the selected set
      list = list.filter((m) =>
        m.category
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .some((c) => selectedCategories.has(c))
      );
    }
    // Pharmacy filter: show only products stocked at the selected pharmacy
    if (selectedPharmacyId && pharmacyListings.size > 0) {
      list = list.filter((m) => pharmacyListings.has(m.id));
    }
    // Product type filter
    if (selectedProductType !== "All") {
      list = list.filter((m) => (m.product_type ?? "").toLowerCase() === selectedProductType);
    }
    if (sort === "price_asc")  list.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [query, selectedCategories, sort, selectedProductType, medicines, selectedPharmacyId, pharmacyListings]);

  // Dynamic heading — mirrors Flutter's conditional title
  const sectionTitle = selectedPharmacy
    ? `${t.store_at} ${selectedPharmacy}`
    : query.trim()
    ? t.store_results
    : selectedCategories.size > 0
    ? t.store_filtered
    : t.store_explore;

  // Pharmacies shown when no search and no category filter active (or pharmacy selected)
  const showPharmacies = query.trim() === "" && selectedCategories.size === 0;

  // Cart count drives topbar badge (via useCartStore in topbar)

  return (
    <div className="p-4 md:p-6 max-w-[1280px] mx-auto">
      {/* ── Prescription Recommendation Banner ───────────────── */}
      {activePrescription && (
        <div className="mb-5 bg-farumasi-50 border border-farumasi-200 rounded-3xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-farumasi-800">
                Finding pharmacies for your prescription
              </p>
              <p className="text-xs text-farumasi-600 mt-0.5">
                {activePrescription.diagnosis} · {activePrescription.items.length} medicine{activePrescription.items.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activePrescription.items.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 text-[11px] bg-white border border-farumasi-200 text-farumasi-700 px-2 py-0.5 rounded-full"
                  >
                    {item.medicineName} {item.strength}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {recLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-0 bg-white rounded-2xl border border-farumasi-100 p-3 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-2 bg-slate-100 rounded w-1/2 mb-3" />
                <div className="h-6 bg-slate-100 rounded" />
              </div>
            ))}
            {!recLoading && recError && (
              <div className="sm:col-span-3 bg-white border border-red-100 text-red-600 text-xs rounded-2xl p-3 text-center">
                {recError}
              </div>
            )}
            {!recLoading && !recError && recommendations.length === 0 && (
              <div className="sm:col-span-3 bg-white border border-farumasi-100 text-slate-500 text-xs rounded-2xl p-3 text-center">
                No pharmacies match this prescription right now. Try again later.
              </div>
            )}
            {!recLoading && !recError && recommendations.map((rec) => {
              const matchPct = Math.round(rec.totalScore * 100);
              const isOrdering = orderingRecId === rec.id;
              return (
                <div
                  key={rec.id ?? `${rec.providerType}-${rec.providerId}-${rec.rank}`}
                  className="min-w-0 bg-white rounded-2xl border border-farumasi-100 p-3 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      #{rec.rank} · {rec.providerName}
                    </p>
                    <span className="text-[10px] font-bold text-farumasi-700 bg-farumasi-50 rounded-full px-1.5 py-0.5 shrink-0">
                      {matchPct}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1.5">
                    {rec.estimatedTotalPrice != null ? `RWF ${Math.round(rec.estimatedTotalPrice).toLocaleString()}` : "Price on request"}
                    {rec.estimatedDistanceKm != null ? ` · ${rec.estimatedDistanceKm.toFixed(1)} km` : ""}
                  </p>
                  <p className="text-[10px] text-slate-500 mb-2">
                    {rec.availableItemsCount}/{rec.totalItemsCount} medicines available
                    {rec.canFulfillCompletePrescription ? " — full match" : ""}
                  </p>
                  {rec.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {rec.reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                  {rec.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {rec.warnings.slice(0, 1).map((w, i) => (
                        <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleOrderFromRecommendation(rec)}
                    disabled={isOrdering || !rec.id}
                    className="mt-auto inline-flex items-center justify-center gap-1 text-[11px] font-semibold bg-farumasi-600 text-white px-2.5 py-1.5 rounded-xl hover:bg-farumasi-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isOrdering ? "Placing…" : "Order with this pharmacy"}
                  </button>
                </div>
              );
            })}
          </div>
          {recIsFallbackLocation && recommendations.length > 0 && (
            <p className="text-[10px] text-farumasi-600/80 mt-2">
              Showing recommendations near Kigali · add your delivery address in Settings for better matches.
            </p>
          )}
        </div>
      )}

      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-4">
        {/* page header only — no cart button; use topbar cart icon */}
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
            FARUMASI Store
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {t.store_subtitle}
          </p>
        </div>
      </div>

      {/* ── Filter bar (no inline search — topbar handles search) ── */}
      <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl border border-[#E4E8EC] shadow-sm px-4 py-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {selectedCategories.size > 0 ? (
            <span className="text-sm text-slate-600">
              {tf(t.store_cats_selected, { n: selectedCategories.size })}
            </span>
          ) : query.trim() ? (
            <span className="text-sm text-slate-500">{t.store_showing_for} <span className="font-semibold text-slate-700">&quot;{query}&quot;</span></span>
          ) : (
            <span className="text-sm text-slate-400">{t.store_select_cat}</span>
          )}
        </div>
        {(selectedCategories.size > 0 || query.trim()) && (
          <button
            onClick={() => { setSelectedCategories(new Set()); useSearchStore.getState().clear(); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 shrink-0"
          >
            <X className="w-3.5 h-3.5" /> {t.store_clear_all}
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all shrink-0",
            showFilters
              ? "bg-farumasi-600 text-white border-farumasi-600"
              : "border-slate-200 text-slate-600 hover:border-farumasi-400 bg-[#F3F6FA]"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters{(sort !== "default" || selectedProductType !== "All") ? ` (${(sort !== "default" ? 1 : 0) + (selectedProductType !== "All" ? 1 : 0)})` : ""}</span>
        </button>
      </div>

      {/* ── Filter panel (when open) ─────────────────────── */}
      {showFilters && (
        <div className="mb-5 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
          {/* Sort row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600 shrink-0">{t.store_sort_by}</span>
            {(
              [
                { val: "default",    label: t.store_sort_default },
                { val: "price_asc",  label: t.store_sort_price_asc },
                { val: "price_desc", label: t.store_sort_price_desc },
              ] as { val: typeof sort; label: string }[]
            ).map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setSort(val)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                  sort === val
                    ? "bg-farumasi-600 text-white border-farumasi-600"
                    : "border-slate-200 text-slate-600 hover:border-farumasi-400"
                )}
              >
                <span className={cn("w-3.5 h-3.5 rounded-full border-2 shrink-0", sort === val ? "border-white bg-white/40" : "border-slate-300")} />
                {label}
              </button>
            ))}
          </div>
          {/* Product type row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-600 shrink-0">Type</span>
            {([{ value: "All", label: "All" }, ...PRODUCT_TYPES] as { value: string; label: string }[]).map((pt) => (
              <button
                key={pt.value}
                onClick={() => setSelectedProductType(pt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-sm font-medium border transition-all",
                  selectedProductType === pt.value
                    ? "bg-farumasi-600 text-white border-farumasi-600"
                    : "border-slate-200 text-slate-600 hover:border-farumasi-400"
                )}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Categories section ───────────────────────────── */}
      <div className="mb-5 bg-[#F6F8FB]">
        {/* Header row */}
        <div className={cn("flex items-center mb-2", hideCategories ? "justify-end" : "justify-between")}>
          {!hideCategories && (
            <h2 className="text-[19px] font-bold text-[#0F172A]">{t.store_categories}</h2>
          )}
          <button
            onClick={() => setHideCategories((h) => !h)}
            className={cn(
              "flex items-center gap-1 rounded-full transition-all text-[#64748B]",
              hideCategories
                ? "bg-white shadow-sm px-3 py-1.5 text-[13px] font-semibold hover:shadow"
                : "p-1.5 hover:bg-slate-100"
            )}
          >
            {hideCategories && <span className="text-[13px] font-semibold">{t.store_cats_toggle}</span>}
            {hideCategories ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Circular icon scroller */}
        {!hideCategories && (
          <div className="relative">
            {/* Left scroll arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scrollCategories("left")}
                className="absolute left-0 top-[6px] bottom-[46px] z-10 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-shadow">
                  <ChevronLeft className="w-5 h-5 text-farumasi-600" />
                </div>
              </button>
            )}

            {/* Scrollable row */}
            <div
              ref={categoryScrollRef}
              onScroll={updateScrollState}
              onMouseDown={onCatMouseDown}
              onMouseMove={onCatMouseMove}
              onMouseUp={onCatMouseUp}
              onMouseLeave={onCatMouseUp}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pt-1 px-1 cursor-grab"
              style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth", touchAction: "pan-x" }}
            >
              {/* "All" chip always first */}
              {[{ name: "All", icon_name: "" }, ...backendCategories].map((cat) => {
                const isAll = cat.name === "All";
                const selected = isAll ? selectedCategories.size === 0 : selectedCategories.has(cat.name.toLowerCase());
                const Icon = isAll ? LayoutGrid : (_ICON_BY_NAME[cat.icon_name] ?? IconGeneral);
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCategory(cat.name)}
                    className="flex flex-col items-center shrink-0 gap-2 hover:opacity-90 transition-opacity"
                    style={{ touchAction: "pan-x" }}
                  >
                    {/* Circle icon container — matches Flutter 12px padding + shape: circle */}
                    <div
                      className={cn(
                        "w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all duration-180 border",
                        selected
                          ? "bg-farumasi-600 border-farumasi-600 shadow-[0_4px_12px_rgba(34,163,111,0.3)]"
                          : "bg-[#F1F5F9] border-[#D8E1EA]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-[26px] h-[26px]",
                          selected ? "text-white" : "text-farumasi-600"
                        )}
                      />
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        "w-[92px] text-center text-[12px] leading-tight truncate",
                        selected
                          ? "font-bold text-[#0F172A]"
                          : "font-medium text-[#334155]"
                      )}
                    >
                      {getCatLabel(cat.name)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right scroll arrow */}
            {canScrollRight && (
              <button
                onClick={() => scrollCategories("right")}
                className="absolute right-0 top-[6px] bottom-[46px] z-10 flex items-center"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-shadow">
                  <ChevronRight className="w-5 h-5 text-farumasi-600" />
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Pharmacies we work with — always visible when no search/category filter ── */}
      {showPharmacies && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[19px] font-bold text-[#0F172A]">{t.store_pharmacies}</h2>
            {selectedPharmacy && (
              <button
                onClick={() => { setSelectedPharmacy(null); setSelectedPharmacyId(null); }}
                className="flex items-center gap-1 text-xs text-farumasi-700 font-semibold bg-farumasi-50 px-3 py-1.5 rounded-full hover:bg-farumasi-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear: {selectedPharmacy}
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            {pharmacies.length === 0 && (
              <p className="text-sm text-slate-400 py-2">Loading partners…</p>
            )}
            {pharmacies.map((pharmacy) => {
              const isSelected = selectedPharmacy === pharmacy.name;
              const mapUrl = pharmacy.latitude && pharmacy.longitude
                ? `https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`
                : pharmacy.address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pharmacy.name + " " + pharmacy.address)}`
                : null;
              return (
                <div
                  key={pharmacy.id}
                  className={cn(
                    "relative flex bg-white rounded-[14px] border overflow-hidden transition-all shrink-0",
                    isSelected
                      ? "border-farumasi-500 shadow-[0_0_0_2px_rgba(30,158,104,0.25)] shadow-md"
                      : "border-[#E6EAEE] shadow-[0_5px_10px_rgba(15,23,42,0.07)] hover:shadow-md hover:border-farumasi-300"
                  )}
                  style={{ width: 250, height: 106 }}
                >
                  {/* Invisible full-card selection button */}
                  <button
                    className="absolute inset-0 w-full h-full z-0"
                    aria-label={`Select ${pharmacy.name}`}
                    onClick={() => {
                      if (isSelected) { setSelectedPharmacy(null); setSelectedPharmacyId(null); }
                      else { setSelectedPharmacy(pharmacy.name); setSelectedPharmacyId(pharmacy.id); }
                    }}
                  />
                  {/* Image / placeholder */}
                  <div className="w-24 shrink-0 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                    {pharmacy.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pharmacy.image_url} alt={pharmacy.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-farumasi-50 to-slate-100">
                        <MapPin className="w-7 h-7 text-farumasi-300" />
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-farumasi-600/30 flex items-center justify-center">
                        <div className="w-7 h-7 rounded-full bg-farumasi-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Text panel */}
                  <div className="flex flex-col justify-center px-3 py-2 min-w-0 flex-1 relative z-10 pointer-events-none">
                    <p className={cn(
                      "text-[14px] font-bold leading-snug line-clamp-2",
                      isSelected ? "text-farumasi-700" : "text-[#0F172A]"
                    )}>
                      {pharmacy.name}
                    </p>
                    <p className="text-[11px] text-[#374151] mt-1 leading-tight line-clamp-1">
                      {pharmacy.district}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight line-clamp-1">
                      {pharmacy.is_open ? "Open now" : "Closed"}
                      {pharmacy.accepts_delivery ? " · Delivers" : ""}
                    </p>
                    {isSelected && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-farumasi-700 bg-farumasi-50 px-2 py-0.5 rounded-full w-fit">
                        {t.store_viewing}
                      </span>
                    )}
                  </div>
                  {/* Map link — z-20 so it sits above the selection button */}
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-farumasi-50 hover:border-farumasi-300 transition-colors"
                      title="View on Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5 text-farumasi-600" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section heading — dynamic like Flutter ────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[19px] font-bold text-[#0F172A]">{sectionTitle}</h2>
        <span className="text-xs text-slate-500">
          {filtered.length} medicine{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Medicine Grid — Flutter SliverGrid with MedicineItem card ───────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <LayoutGrid className="w-14 h-14 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">{t.store_no_medicines}</p>
          <p className="text-slate-400 text-sm mt-1">{t.store_try_search}</p>
        </div>
      ) : (
        /* Flutter: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent:~220, mainAxisExtent:~300, crossAxisSpacing:14, mainAxisSpacing:14) */
        <div
          className="grid gap-[14px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {filtered.map((med) => {
            // Cart keys are "productId:pack" or "productId:partial"
            const isInCart = (cartItems[cartLineKey(med.id, "pack")]?.qty ?? 0) > 0
              || (cartItems[cartLineKey(med.id, "partial")]?.qty ?? 0) > 0;
            // Pharmacy-specific price — from the real listings map for selected pharmacy
            const pharmacyEntry = selectedPharmacyId
              ? pharmacyListings.get(med.id)
              : null;
            const displayPrice = pharmacyEntry?.price ?? med.price;

            // Image click: for partial-selling products open the mode picker modal;
            // for plain products add to cart immediately (or remove if already in).
            const handleImageClick = () => {
              if (med.requiresPrescription) {
                toast.error(
                  tf(t.toast_rx_toast, { name: med.name }),
                  { duration: 4000 }
                );
                return;
              }
              if (med.allowsPartialSelling) {
                const initMode: SellMode = "pack";
                setQuickAdd(med);
                setQuickAddMode(initMode);
                setQuickAddQty(minQuantityForLine(med, initMode));
                return;
              }
              if (isInCart) {
                cartRemove(cartLineKey(med.id, "pack"));
                cartRemove(cartLineKey(med.id, "partial"));
                toast(tf(t.toast_removed, { name: med.name }), { icon: undefined });
              } else {
                cartAdd(med);
                toast.success(tf(t.toast_added, { name: med.name }));
              }
            };
            return (
              /* Flutter Card(elevation:2, margin:all(8), borderRadius:12) */
              <div
                key={med.id}
                className="bg-white rounded-[12px] shadow-md overflow-hidden flex flex-col m-2"
                style={{ height: 310 }}
              >
                {/* Image area — click to add/remove from cart instantly */}
                <div
                  className="relative flex-1 bg-slate-100 overflow-hidden cursor-pointer select-none"
                  onClick={handleImageClick}
                  title={med.requiresPrescription ? "Prescription required" : isInCart ? "Click to remove from cart" : "Click to add to cart"}
                >
                  {med.imageUrl ? (
                    <img
                      src={med.imageUrl}
                      alt={med.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Pill className="w-14 h-14 text-slate-200" />
                    </div>
                  )}
                  {/* Rx lock overlay */}
                  {med.requiresPrescription && (
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center rounded-t-[12px] gap-1">
                      <div className="w-10 h-10 rounded-full bg-amber-500/90 border-2 border-white flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white text-[9px] font-bold bg-black/40 px-2 py-0.5 rounded-full">{t.store_rx_badge}</span>
                    </div>
                  )}
                  {/* In-cart overlay — green checkmark circle */}
                  {!med.requiresPrescription && isInCart && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-[12px]">
                      <div className="w-12 h-12 rounded-full bg-farumasi-600 border-2 border-white flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Text area — Flutter Padding(all:10) */}
                <div className="p-[10px] flex flex-col">
                  {/* Name — 13px bold, 1-line ellipsis */}
                  <p
                    className="text-[13px] font-bold text-[#0F172A] truncate cursor-pointer hover:text-farumasi-700"
                    onClick={() => setQuickView(med)}
                  >
                    {med.name}
                  </p>
                  {/* Price — 12px bold green; shows pharmacy-specific price when pharmacy is selected */}
                  <p className="text-[12px] font-bold text-farumasi-600 mt-1">
                    {formatPrice(displayPrice)}
                    {!selectedPharmacy && med.maxPrice && med.maxPrice !== med.price ? ` – ${formatPrice(med.maxPrice)}` : ""}
                    {selectedPharmacy && (
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        @ {selectedPharmacy.split(" ")[0]}
                      </span>
                    )}
                  </p>
                  {/* Partial / per-unit price */}
                  {med.allowsPartialSelling && med.unitPriceFrom != null && (
                    <p className="text-[10px] text-farumasi-500 mt-0.5">
                      or {formatPrice(med.unitPriceFrom)}/{med.partialUnitName ?? "unit"}
                    </p>
                  )}
                  {/* Rx badge */}
                  {med.requiresPrescription && (
                    <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {t.store_rx_badge}
                    </p>
                  )}
                  {/* Description peek + Read more */}
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-[1.2] mt-1">
                    {med.description}
                  </p>
                  <button
                    onClick={() => setQuickView(med)}
                    className="text-[10px] text-farumasi-600 font-bold mt-0.5 hover:underline text-left"
                  >
                    {t.store_read_more}
                  </button>

                  {/* Bottom row: About > link + cart icon button */}
                  <div className="flex items-center justify-between mt-2">
                    <Link
                      href={`/store/${med.id}`}
                      className="text-[15px] font-bold text-farumasi-600 underline underline-offset-2 hover:text-farumasi-700"
                    >
                      {t.store_about}
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (med.requiresPrescription) {
                          toast.error(
                            tf(t.toast_rx_toast, { name: med.name }),
                            { duration: 4000 }
                          );
                          return;
                        }
                        if (med.allowsPartialSelling) {
                          const initMode: SellMode = "pack";
                          setQuickAdd(med);
                          setQuickAddMode(initMode);
                          setQuickAddQty(minQuantityForLine(med, initMode));
                          return;
                        }
                        cartAdd(med);
                        toast.success(tf(t.toast_added, { name: med.name }));
                      }}
                      className={cn(
                        "rounded-[4px] p-[6px] transition-colors",
                        med.requiresPrescription
                          ? "bg-amber-400 hover:bg-amber-500"
                          : isInCart
                          ? "bg-farumasi-700"
                          : "bg-farumasi-600 hover:bg-farumasi-700"
                      )}
                      title={med.requiresPrescription ? "Prescription required" : "Add to cart"}
                    >
                      <ShoppingCart className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick View Modal ─────────────────────────────── */}
      {quickView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setQuickView(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Compact Patient Overview card */}
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setQuickView(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Product name */}
            <p className="text-xs font-semibold text-farumasi-600 uppercase tracking-wider pr-8">
              {quickView.name}
            </p>

            {/* Section label */}
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Patient Overview
            </p>

            {/* Overview text — use short description (plain text), not overview (may be HTML) */}
            <p className="text-sm text-slate-700 leading-relaxed">
              {quickView.shortDescription || quickView.description}
            </p>

            {/* Dosage Guide — always use dosage_summary (short plain text) */}
            {quickView.dosageSummary && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">
                  Dosage Guide
                </p>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  {quickView.dosageSummary}
                </p>
              </div>
            )}

            {/* Pricing — pack price + partial unit price when applicable */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pricing</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Whole pack / container</span>
                <span className="text-sm font-extrabold text-farumasi-700">
                  {formatPrice(quickView.price)}
                  {quickView.maxPrice && quickView.maxPrice !== quickView.price
                    ? ` – ${formatPrice(quickView.maxPrice)}`
                    : ""}
                </span>
              </div>
              {quickView.allowsPartialSelling && quickView.unitPriceFrom != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">
                    Per {quickView.partialUnitName ?? "unit"}
                  </span>
                  <span className="text-sm font-extrabold text-farumasi-500">
                    {formatPrice(quickView.unitPriceFrom)}
                    <span className="text-[10px] text-slate-400 font-normal ml-0.5">/ {quickView.partialUnitName ?? "unit"}</span>
                  </span>
                </div>
              )}
              {quickView.allowsPartialSelling && quickView.minPartialQuantity != null && quickView.minPartialQuantity > 1 && (
                <p className="text-[10px] text-slate-400 italic">
                  Min. {quickView.minPartialQuantity} {quickView.partialUnitName ?? "units"} for partial order
                </p>
              )}
            </div>

            {/* CTA — add to cart or go to detail page */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setQuickView(null);
                  if (quickView.allowsPartialSelling) {
                    const initMode: SellMode = "pack";
                    setQuickAdd(quickView);
                    setQuickAddMode(initMode);
                    setQuickAddQty(minQuantityForLine(quickView, initMode));
                  } else if (!quickView.requiresPrescription) {
                    cartAdd(quickView);
                    toast.success(tf(t.toast_added, { name: quickView.name }));
                  }
                }}
                className={cn(
                  "flex-1 h-9 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                  quickView.requiresPrescription
                    ? "bg-amber-500 cursor-not-allowed opacity-60"
                    : "bg-farumasi-600 hover:bg-farumasi-700"
                )}
                disabled={quickView.requiresPrescription}
                title={quickView.requiresPrescription ? "Prescription required" : undefined}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {quickView.requiresPrescription ? "Rx Required" : "Add to Cart"}
              </button>
              <Link
                href={`/store/${quickView.id}`}
                className="flex-1 h-9 rounded-2xl border border-farumasi-200 text-farumasi-700 text-xs font-bold flex items-center justify-center hover:bg-farumasi-50 transition-colors"
                onClick={() => setQuickView(null)}
              >
                Full Details →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick-Add Modal (sell mode + qty picker) ──────────── */}
      {quickAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setQuickAdd(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl z-10 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setQuickAdd(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div>
              <p className="text-xs text-farumasi-600 font-semibold uppercase tracking-wide pr-8">{quickAdd.name}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{quickAdd.category}</p>
            </div>

            {/* Sell mode toggle */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">How would you like to buy?</p>
              <div className="grid grid-cols-2 gap-2">
                {(["pack", "partial"] as SellMode[]).map((mode) => {
                  const label = mode === "pack"
                    ? "Whole pack / box"
                    : `By ${quickAdd.partialUnitName ?? "unit"}`;
                  const priceNote = mode === "pack"
                    ? formatPrice(quickAdd.price)
                    : (quickAdd.unitPriceFrom != null ? `${formatPrice(quickAdd.unitPriceFrom)} / ${quickAdd.partialUnitName ?? "unit"}` : "Price varies");
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setQuickAddMode(mode);
                        setQuickAddQty(minQuantityForLine(quickAdd, mode));
                      }}
                      className={cn(
                        "flex flex-col items-start gap-0.5 p-3 rounded-2xl border-2 text-left transition-all",
                        quickAddMode === mode
                          ? "border-farumasi-500 bg-farumasi-50"
                          : "border-slate-100 hover:border-farumasi-200"
                      )}
                    >
                      <span className="text-xs font-bold text-slate-800">{label}</span>
                      <span className="text-[11px] text-farumasi-600 font-semibold">{priceNote}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity picker */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {quickAddMode === "partial"
                  ? `How many ${quickAdd.partialUnitName ?? "units"}?`
                  : "How many packs?"}
              </p>
              {quickAddMode === "partial" && quickAdd.minPartialQuantity != null && quickAdd.minPartialQuantity > 1 && (
                <p className="text-[10px] text-slate-400 mb-1.5 italic">
                  Minimum {quickAdd.minPartialQuantity} {quickAdd.partialUnitName ?? "units"}
                </p>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuickAddQty((q) => Math.max(minQuantityForLine(quickAdd, quickAddMode), q - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-lg font-extrabold text-slate-900 w-10 text-center tabular-nums">{quickAddQty}</span>
                <button
                  onClick={() => setQuickAddQty((q) => q + 1)}
                  className="w-9 h-9 rounded-xl bg-farumasi-600 text-white flex items-center justify-center hover:bg-farumasi-700 font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 ml-1">
                  {lineUnitLabel(quickAddMode, quickAdd.partialUnitName, quickAdd.unitsPerPack)}
                </span>
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={() => {
                cartAdd(quickAdd, quickAddQty, quickAddMode);
                const unit = lineUnitLabel(quickAddMode, quickAdd.partialUnitName, quickAdd.unitsPerPack);
                toast.success(`${quickAdd.name} ×${quickAddQty} ${unit} added to cart`);
                setQuickAdd(null);
              }}
              className="w-full h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add {quickAddQty} {lineUnitLabel(quickAddMode, quickAdd.partialUnitName, quickAdd.unitsPerPack)} to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
