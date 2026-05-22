"use client";
import { useState, useMemo } from "react";
import {
  Package, Search, Grid3X3, Filter, RefreshCw,
  TrendingUp, AlertTriangle, CheckCircle2, MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { cn, getStockColor, getStockBg, formatRWF } from "@/lib/utils";
import type { MedicineCategory, Medicine, Pharmacy } from "@/types";

const MEDICINES: Medicine[] = [];
const PHARMACIES: Pharmacy[] = [];

const CATEGORY_OPTIONS: (MedicineCategory | "All")[] = [
  "All", "Analgesic", "Antibiotic", "Antimalarial", "Antidiabetic",
  "Antihypertensive", "Antiparasitic", "Antiretroviral", "GI/Gastro", "Cardiovascular",
];

const STOCK_LABELS = ["High", "Medium", "Low", "Out"] as const;

const LEGEND = [
  { level: "High", label: "High Stock", bg: "bg-green-100", text: "text-green-800" },
  { level: "Medium", label: "Medium Stock", bg: "bg-amber-100", text: "text-amber-800" },
  { level: "Low", label: "Low Stock", bg: "bg-orange-100", text: "text-orange-800" },
  { level: "Out", label: "Out of Stock", bg: "bg-red-100", text: "text-red-800" },
  { level: "N/A", label: "Not Listed", bg: "bg-slate-100", text: "text-slate-400" },
];

export default function AvailabilityPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | "All">("All");
  const [stockFilter, setStockFilter] = useState<"all" | "Low" | "Out">("all");
  const [selectedPharmacyIds, setSelectedPharmacyIds] = useState<Set<string>>(
    new Set(PHARMACIES.map((p) => p.id))
  );

  const togglePharmacy = (id: string) => {
    setSelectedPharmacyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least 1
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visiblePharmacies = PHARMACIES.filter((p) => selectedPharmacyIds.has(p.id));

  const filteredMedicines = useMemo(() => {
    const q = search.toLowerCase();
    return MEDICINES.filter((m) => {
      const matchSearch =
        !q ||
        m.genericName.toLowerCase().includes(q) ||
        m.brandNames.some((b) => b.toLowerCase().includes(q));
      const matchCategory = selectedCategory === "All" || m.category === selectedCategory;

      if (stockFilter !== "all") {
        const hasIssue = m.availability.some(
          (a) => selectedPharmacyIds.has(a.pharmacyId) && a.stockLevel === stockFilter
        );
        if (!hasIssue) return false;
      }

      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory, stockFilter, selectedPharmacyIds]);

  const getAvailability = (medicineId: string, pharmacyId: string) => {
    const med = MEDICINES.find((m) => m.id === medicineId);
    return med?.availability.find((a) => a.pharmacyId === pharmacyId) ?? null;
  };

  const overallStats = useMemo(() => {
    let totalCells = 0;
    let inStockCells = 0;
    let lowCells = 0;
    let outCells = 0;

    MEDICINES.forEach((m) => {
      PHARMACIES.forEach((p) => {
        totalCells++;
        const avail = m.availability.find((a) => a.pharmacyId === p.id);
        if (!avail) return;
        if (avail.stockLevel === "High" || avail.stockLevel === "Medium") inStockCells++;
        if (avail.stockLevel === "Low") lowCells++;
        if (avail.stockLevel === "Out") outCells++;
      });
    });

    return { totalCells, inStockCells, lowCells, outCells };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Availability Intelligence"
        subtitle="Real-time medicine × pharmacy stock matrix for your prescribing network"
        icon={<Grid3X3 className="w-5 h-5" />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Medicines Tracked", value: MEDICINES.length, color: "text-slate-800" },
          { label: "Network Pharmacies", value: PHARMACIES.length, color: "text-farumasi-700" },
          { label: "Low/Critical Stock", value: overallStats.lowCells + overallStats.outCells, color: "text-amber-700" },
          { label: "Out of Stock", value: overallStats.outCells, color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pharmacy toggle filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-farumasi-600" />
          Pharmacy Network ({visiblePharmacies.length} visible)
        </p>
        <div className="flex flex-wrap gap-2">
          {PHARMACIES.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePharmacy(p.id)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                selectedPharmacyIds.has(p.id)
                  ? "bg-farumasi-600 text-white border-farumasi-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {p.name.split(" ").slice(0, 2).join(" ")}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Category + Stock Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-farumasi-300"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as MedicineCategory | "All")}
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-300"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {[
            { val: "all", label: "All Stock" },
            { val: "Low", label: "Low" },
            { val: "Out", label: "Out of Stock" },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setStockFilter(opt.val as any)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                stockFilter === opt.val
                  ? "bg-farumasi-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">Legend:</span>
        {LEGEND.map((l) => (
          <div key={l.level} className="flex items-center gap-1.5">
            <div className={cn("w-4 h-4 rounded", l.bg)} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid matrix */}
      {filteredMedicines.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No medicines match your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 min-w-[200px] sticky left-0 bg-slate-50 z-10">
                    Medicine
                  </th>
                  {visiblePharmacies.map((p) => (
                    <th
                      key={p.id}
                      className="px-2 py-3 text-center text-[10px] font-semibold text-slate-600 min-w-[110px]"
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="truncate max-w-[100px]">{p.name.split("(")[0].trim()}</span>
                        <span className="text-slate-400 font-normal">{p.distanceKm} km</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMedicines.map((med, idx) => (
                  <tr
                    key={med.id}
                    className={cn("border-b border-slate-50 hover:bg-slate-50/50 transition-colors", idx % 2 === 0 ? "" : "bg-slate-50/30")}
                  >
                    {/* Medicine name cell */}
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{med.genericName}</p>
                        <p className="text-[10px] text-slate-400">{med.strength} · {med.dosageForm}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-slate-400">{med.category}</span>
                          {med.isEssentialMedicine && (
                            <span className="text-[9px] bg-farumasi-50 text-farumasi-700 px-1 rounded">Essential</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Availability cells */}
                    {visiblePharmacies.map((p) => {
                      const avail = getAvailability(med.id, p.id);
                      if (!avail) {
                        return (
                          <td key={p.id} className="px-2 py-3 text-center">
                            <div className="mx-auto w-16 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <span className="text-[10px] text-slate-400">—</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={p.id} className="px-2 py-3 text-center">
                          <div
                            className={cn(
                              "mx-auto px-2 py-1.5 rounded-lg flex flex-col items-center gap-0.5 min-w-[80px]",
                              getStockBg(avail.stockLevel)
                            )}
                          >
                            <span className={cn("text-[10px] font-semibold", getStockColor(avail.stockLevel))}>
                              {avail.stockLevel}
                            </span>
                            <span className="text-[9px] text-slate-500">{formatRWF(avail.price)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {filteredMedicines.length} of {MEDICINES.length} medicines
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw className="w-3 h-3" />
              Updated &lt; 6h ago
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
