"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { mockMedicines, mockPharmacies } from "@/data/mock";
import { cn, formatPrice } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
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
  // ── Search from topbar via Zustand — mirrors Flutter StateService searchQuery ──
  const { query } = useSearchStore();

  // ── Multi-select categories — mirrors Flutter Set<String> _selectedCategories ──
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sort, setSort]       = useState<"default" | "price_asc" | "price_desc" | "rating">("default");
  const [cart, setCart]       = useState<Record<string, number>>({});
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
    return list;
  }, [query, selectedCategories, selectedPharmacy, sort]);

  // Dynamic heading — mirrors Flutter's conditional title
  const sectionTitle = selectedPharmacy
    ? `Medicines at ${selectedPharmacy}`
    : query.trim()
    ? "Search Results"
    : selectedCategories.size > 0
    ? "Filtered Results"
    : "Explore Medicines";

  // Pharmacies shown when no search and no category filter active (or pharmacy selected)
  const showPharmacies = query.trim() === "" && selectedCategories.size === 0;

  const addToCart = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((c) => {
      const qty = (c[id] ?? 0) - 1;
      if (qty <= 0) { const n = { ...c }; delete n[id]; return n; }
      return { ...c, [id]: qty };
    });
  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-6 max-w-[1280px] mx-auto">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
            FARUMASI Store
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Your trusted digital pharmacy partner in Rwanda
          </p>
        </div>
        {totalCartItems > 0 && (
          <Link
            href="/cart"
            className="flex items-center gap-2 bg-farumasi-600 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold hover:bg-farumasi-700 transition-colors shrink-0 shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart ({totalCartItems})
          </Link>
        )}
      </div>

      {/* ── Filter bar (no inline search — topbar handles search) ── */}
      <div className="flex items-center gap-3 mb-5 bg-white rounded-2xl border border-[#E4E8EC] shadow-sm px-4 py-3">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {selectedCategories.size > 0 ? (
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-farumasi-700">{selectedCategories.size}</span> categor{selectedCategories.size > 1 ? "ies" : "y"} selected
            </span>
          ) : query.trim() ? (
            <span className="text-sm text-slate-500">Showing results for <span className="font-semibold text-slate-700">&quot;{query}&quot;</span></span>
          ) : (
            <span className="text-sm text-slate-400">Select a category or search above</span>
          )}
        </div>
        {(selectedCategories.size > 0 || query.trim()) && (
          <button
            onClick={() => { setSelectedCategories(new Set()); useSearchStore.getState().clear(); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Clear all
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
          <span className="text-sm font-medium text-slate-600 shrink-0">Sort by:</span>
          {(
            [
              { val: "default",    label: "Default" },
              { val: "price_asc",  label: "Price: Low → High" },
              { val: "price_desc", label: "Price: High → Low" },
              { val: "rating",     label: "Top Rated" },
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
            <h2 className="text-[19px] font-bold text-[#0F172A]">Browse Categories</h2>
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
            {hideCategories && <span className="text-[13px] font-semibold">Categories</span>}
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
                      {cat}
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
            <h2 className="text-[19px] font-bold text-[#0F172A]">Pharmacies we work with</h2>
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
                        Viewing products
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
          <p className="text-slate-600 font-semibold">No medicines found</p>
          <p className="text-slate-400 text-sm mt-1">Try a different search or category</p>
        </div>
      ) : (
        /* Flutter: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent:~220, mainAxisExtent:~300, crossAxisSpacing:14, mainAxisSpacing:14) */
        <div
          className="grid gap-[14px]"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
        >
          {filtered.map((med) => {
            const isInCart = (cart[med.id] ?? 0) > 0;
            // Pharmacy-specific price — mirrors Flutter PharmacyDetailScreen showing per-pharmacy pricing
            const pharmacyEntry = selectedPharmacy
              ? med.marketingPharmacies.find((p) => p.pharmacyName === selectedPharmacy)
              : null;
            const displayPrice = pharmacyEntry?.price ?? med.price;
            const toggleCart = () => {
              if (med.requiresPrescription) return;
              if (isInCart) {
                setCart((c) => { const n = { ...c }; delete n[med.id]; return n; });
              } else {
                addToCart(med.id);
              }
            };
            return (
              /* Flutter Card(elevation:2, margin:all(8), borderRadius:12) */
              <div
                key={med.id}
                className="bg-white rounded-[12px] shadow-md overflow-hidden flex flex-col m-2"
                style={{ height: 310 }}
              >
                {/* Image area — Flutter Expanded: tap to toggle cart, overlay when in cart */}
                <div
                  className="relative flex-1 bg-slate-100 overflow-hidden cursor-pointer"
                  onClick={toggleCart}
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
                  {/* In-cart overlay — green checkmark circle */}
                  {isInCart && (
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
                    className="text-[13px] font-bold text-[#0F172A] truncate cursor-pointer"
                    onClick={toggleCart}
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
                      Rx Required
                    </p>
                  )}
                  {/* Description peek + Read more */}
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-[1.2] mt-1">
                    {med.description}
                  </p>
                  <p className="text-[10px] text-blue-500 font-bold mt-0.5">Read more...</p>

                  {/* Bottom row: About > link + cart icon button */}
                  <div className="flex items-center justify-between mt-2">
                    <Link
                      href={`/store/${med.id}`}
                      className="text-[15px] font-bold text-farumasi-600 underline underline-offset-2 hover:text-farumasi-700"
                    >
                      About &gt;
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!med.requiresPrescription) addToCart(med.id); }}
                      disabled={med.requiresPrescription}
                      className={cn(
                        "rounded-[4px] p-[6px] transition-colors",
                        med.requiresPrescription
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-farumasi-600 hover:bg-farumasi-700"
                      )}
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
    </div>
  );
}
