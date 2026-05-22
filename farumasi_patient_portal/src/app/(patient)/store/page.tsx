"use client";

import { useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { mockMedicines, mockPharmacies, mockDigitalPrescriptions } from "@/data/mock";
import { localizeMedicine } from "@/data/mock-i18n";
import { useLanguageStore } from "@/store/language-store";
import { cn, formatPrice } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
import { useCartStore } from "@/store/cart-store";
import type { Medicine } from "@/types";
import { toast } from "sonner";
import { useTranslation, tf } from "@/lib/translations";
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
  Sunrise,
  Moon,
  Clock,
  AlertTriangle,
  CheckCircle,
  // Category icons — mirrors Flutter _getCategoryIcon
  Stethoscope,     // Pain Relief   (Icons.healing)
  FlaskConical,    // Antibiotics   (Icons.science)
  Sun,             // Vitamins      (Icons.wb_sunny)
  Snowflake,       // Cold & Flu    (Icons.snowing)
  Sparkles,        // Skincare      (Icons.face_retouching_natural)
  ShieldCheck,     // Hygiene
  Dumbbell,        // Nutrition     (Icons.fitness_center)
  Heart,           // Sexual Health (Icons.favorite)
  Accessibility,   // Mobility Aids (Icons.accessible)
  Baby,            // Mother & Baby (Icons.child_friendly)
  HeartPulse,      // Devices       (Icons.monitor_heart → nearest available)
  Cross,           // First Aid     (Icons.medical_services)
  Pill,            // Chronic Care  (Icons.medication_liquid)
  Activity,        // Diabetes
  Wind,            // Allergy
  Bug,             // Malaria
  Droplets,        // Digestive Health
  LayoutGrid,      // All
  MoreHorizontal,  // Others
} from "lucide-react";

// ── Category → Icon mapping — exact mirrors of Flutter _getCategoryIcon ─────
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "All":              LayoutGrid,
  "Pain Relief":      Stethoscope,
  "Antibiotics":      FlaskConical,
  "Vitamins":         Sun,
  "Cold & Flu":       Snowflake,
  "Skincare":         Sparkles,
  "Hygiene":          ShieldCheck,
  "Nutrition":        Dumbbell,
  "Sexual Health":    Heart,
  "Mobility Aids":    Accessibility,
  "Mother & Baby":    Baby,
  "Devices":          HeartPulse,
  "First Aid":        Cross,
  "Chronic Care":     Pill,
  "Diabetes":         Activity,
  "Allergy":          Wind,
  "Malaria":          Bug,
  "Digestive Health": Droplets,
  "Others":           MoreHorizontal,
};

function getCategoryIcon(cat: string): React.ElementType {
  return CATEGORY_ICONS[cat] ?? LayoutGrid;
}

// Fixed category order — mirrors Flutter _getCategoryIcon listing order
const CATEGORIES: string[] = [
  "All",
  "Pain Relief", "Antibiotics", "Vitamins", "Cold & Flu",
  "Skincare", "Hygiene", "Nutrition", "Sexual Health",
  "Mobility Aids", "Mother & Baby", "Devices",
  "First Aid", "Chronic Care", "Diabetes",
  "Allergy", "Malaria", "Digestive Health", "Others",
];

export default function StorePage() {
  return (
    <Suspense>
      <StorePageInner />
    </Suspense>
  );
}

function StorePageInner() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get("prescription");
  const activePrescription = prescriptionId
    ? mockDigitalPrescriptions.find((rx) => rx.id === prescriptionId) ?? null
    : null;

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
  const [sort, setSort]       = useState<"default" | "price_asc" | "price_desc" | "rating">("default");
  const { items: cartItems, add: cartAdd, remove: cartRemove } = useCartStore();
  const [quickView, setQuickView] = useState<Medicine | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hideCategories, setHideCategories] = useState(false);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  // Pharmacy filter — mirrors Flutter PharmacyDetailScreen navigation
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);

  // Toggle category — clicking "All" clears all; clicking active deselects; clicking inactive adds
  function toggleCategory(cat: string) {
    if (cat === "All") { setSelectedCategories(new Set()); return; }
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
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
    let list = [...mockMedicines];
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
      list = list.filter((m) => selectedCategories.has(m.category));
    }
    // Pharmacy filter — only show medicines stocked at selected pharmacy
    if (selectedPharmacy) {
      list = list.filter((m) =>
        m.marketingPharmacies.some((p) => p.pharmacyName === selectedPharmacy)
      );
    }
    if (sort === "price_asc")  list.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    if (sort === "rating")     list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list.map((m) => localizeMedicine(m, lang));
  }, [query, selectedCategories, selectedPharmacy, sort, lang]);

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
          <div className="mt-3 flex items-center gap-2">
            {mockPharmacies.slice(0, 3).map((pharmacy) => (
              <div
                key={pharmacy.id}
                className="flex-1 min-w-0 bg-white rounded-2xl border border-farumasi-100 p-3 text-center"
              >
                <p className="text-xs font-bold text-slate-800 truncate">{pharmacy.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{pharmacy.locationName}</p>
                <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                  {pharmacy.supportedInsurances.slice(0, 2).map((ins) => (
                    <span key={ins} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      {ins}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
          <span>Sort</span>
        </button>
      </div>

      {/* ── Sort options (when filters open) ─────────────── */}
      {showFilters && (
        <div className="flex items-center gap-3 mb-5 flex-wrap bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <span className="text-sm font-medium text-slate-600 shrink-0">{t.store_sort_by}</span>
          {(
            [
              { val: "default",    label: t.store_sort_default },
              { val: "price_asc",  label: t.store_sort_price_asc },
              { val: "price_desc", label: t.store_sort_price_desc },
              { val: "rating",     label: t.store_sort_rating },
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
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded-full border-2 shrink-0",
                  sort === val ? "border-white bg-white/40" : "border-slate-300"
                )}
              />
              {label}
            </button>
          ))}
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
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-1 cursor-pointer"
            >
              {CATEGORIES.map((cat) => {
                const isAll = cat === "All";
                const selected = isAll ? selectedCategories.size === 0 : selectedCategories.has(cat);
                const Icon = getCategoryIcon(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="flex flex-col items-center shrink-0 gap-2 hover:opacity-90 transition-opacity"
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
                      {getCatLabel(cat)}
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
                onClick={() => setSelectedPharmacy(null)}
                className="flex items-center gap-1 text-xs text-farumasi-700 font-semibold bg-farumasi-50 px-3 py-1.5 rounded-full hover:bg-farumasi-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear: {selectedPharmacy}
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            {mockPharmacies.map((pharmacy) => {
              const isSelected = selectedPharmacy === pharmacy.name;
              return (
                <button
                  key={pharmacy.id}
                  onClick={() => setSelectedPharmacy(isSelected ? null : pharmacy.name)}
                  className={cn(
                    "flex bg-white rounded-[14px] border overflow-hidden transition-all shrink-0 text-left",
                    isSelected
                      ? "border-farumasi-500 shadow-[0_0_0_2px_rgba(30,158,104,0.25)] shadow-md"
                      : "border-[#E6EAEE] shadow-[0_5px_10px_rgba(15,23,42,0.07)] hover:shadow-md hover:border-farumasi-300"
                  )}
                  style={{ width: 250, height: 106 }}
                >
                  {/* Image fills left side */}
                  <div className="w-24 shrink-0 overflow-hidden relative">
                    {pharmacy.imageUrl ? (
                      <img
                        src={pharmacy.imageUrl}
                        alt={pharmacy.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <MapPin className="w-7 h-7 text-slate-300" />
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
                  <div className="flex flex-col justify-center px-3 py-2 min-w-0 flex-1">
                    <p className={cn(
                      "text-[14px] font-bold leading-snug line-clamp-2",
                      isSelected ? "text-farumasi-700" : "text-[#0F172A]"
                    )}>
                      {pharmacy.name}
                    </p>
                    <p className="text-[11px] text-[#374151] mt-1 leading-tight line-clamp-1">
                      {pharmacy.district}, {pharmacy.province}
                    </p>
                    {isSelected && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-farumasi-700 bg-farumasi-50 px-2 py-0.5 rounded-full w-fit">
                        {t.store_viewing}
                      </span>
                    )}
                  </div>
                </button>
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
            const isInCart = (cartItems[med.id]?.qty ?? 0) > 0;
            // Pharmacy-specific price — mirrors Flutter PharmacyDetailScreen showing per-pharmacy pricing
            const pharmacyEntry = selectedPharmacy
              ? med.marketingPharmacies.find((p) => p.pharmacyName === selectedPharmacy)
              : null;
            const displayPrice = pharmacyEntry?.price ?? med.price;

            // Image click: add to cart immediately, or show Rx denial
            const handleImageClick = () => {
              if (med.requiresPrescription) {
                toast.error(
                  tf(t.toast_rx_toast, { name: med.name }),
                  { duration: 4000 }
                );
                return;
              }
              if (isInCart) {
                cartRemove(med.id);
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
                    {!selectedPharmacy && med.maxPrice ? ` – ${formatPrice(med.maxPrice)}` : ""}
                    {selectedPharmacy && (
                      <span className="ml-1 text-[10px] font-normal text-slate-400">
                        @ {selectedPharmacy.split(" ")[0]}
                      </span>
                    )}
                  </p>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={() => setQuickView(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-2xl z-10 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header image */}
            <div className="relative h-48 bg-slate-100 shrink-0">
              {quickView.imageUrl ? (
                <img src={quickView.imageUrl} alt={quickView.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Pill className="w-16 h-16 text-slate-200" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <button
                onClick={() => setQuickView(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-4 right-12">
                <span className="text-xs font-semibold text-white/70 bg-white/15 px-2 py-0.5 rounded-full">{quickView.category}</span>
                <h2 className="text-white font-extrabold text-lg leading-snug mt-1">{quickView.name}</h2>
                {quickView.manufacturer && (
                  <p className="text-xs text-white/70 mt-0.5">by {quickView.manufacturer}</p>
                )}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">{quickView.description}</p>

              {(quickView.doseMorning || quickView.doseAfternoon || quickView.doseEvening) && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.store_dosing}</p>
                  <div className="flex flex-wrap gap-2">
                    {quickView.doseMorning && quickView.doseMorning !== "None" && (
                      <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <Sunrise className="w-3 h-3" /> {t.store_morning} &middot; {quickView.doseMorning}
                      </span>
                    )}
                    {quickView.doseAfternoon && quickView.doseAfternoon !== "None" && (
                      <span className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <Sun className="w-3 h-3" /> {t.store_afternoon} &middot; {quickView.doseAfternoon}
                      </span>
                    )}
                    {quickView.doseEvening && quickView.doseEvening !== "None" && (
                      <span className="flex items-center gap-1.5 bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <Moon className="w-3 h-3" /> {t.store_evening} &middot; {quickView.doseEvening}
                      </span>
                    )}
                    {quickView.doseTimeInterval && (
                      <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                        <Clock className="w-3 h-3" /> {quickView.doseTimeInterval}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {quickView.sideEffects && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> {t.store_side_effects}
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed">{quickView.sideEffects}</p>
                </div>
              )}

              {quickView.marketingPharmacies.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.store_available_at}</p>
                  <div className="space-y-1.5">
                    {quickView.marketingPharmacies.slice(0, 3).map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                        <span className="text-sm text-slate-700 font-medium">{p.pharmacyName}</span>
                        <span className={cn(
                          "text-xs font-bold",
                          p.stockStatus === "available" ? "text-farumasi-600" :
                          p.stockStatus === "low_stock"  ? "text-amber-600" : "text-red-500"
                        )}>
                          {p.stockStatus === "available" ? t.store_in_stock : p.stockStatus === "low_stock" ? t.store_low_stock : t.store_out_of_stock}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
              <Link
                href={`/store/${quickView.id}`}
                onClick={() => setQuickView(null)}
                className="flex-1 h-11 rounded-2xl border-2 border-farumasi-600 text-farumasi-700 font-bold text-sm flex items-center justify-center hover:bg-farumasi-50 transition-colors"
              >
                {t.store_full_details}
              </Link>
              <button
                onClick={() => {
                  if (quickView.requiresPrescription) {
                    toast.error(
                      tf(t.toast_rx_modal, { name: quickView.name }),
                      { duration: 5000 }
                    );
                    return;
                  }
                  cartAdd(quickView);
                  toast.success(tf(t.toast_added, { name: quickView.name }));
                  setQuickView(null);
                }}
                className={cn(
                  "flex-1 h-11 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors",
                  quickView.requiresPrescription
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-farumasi-600 hover:bg-farumasi-700"
                )}
              >
                {quickView.requiresPrescription
                  ? <><AlertCircle className="w-4 h-4" /> {t.store_rx_btn}</>
                  : <><ShoppingCart className="w-4 h-4" /> {t.store_add_cart}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
