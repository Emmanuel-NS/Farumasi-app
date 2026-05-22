"use client";
import { useState, useMemo } from "react";
import {
  Search, Pill, MapPin, Shield, TrendingUp, AlertTriangle, Brain,
  Package, Filter, ChevronDown, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { scoreMedicineForPatient } from "@/lib/intelligence";
import {
  getStockBg, getStockColor, getScoreBgColor, formatRWF,
} from "@/lib/utils";
import type { Medicine, MedicineCategory, Patient } from "@/types";

const MEDICINES: Medicine[] = [];
const PATIENTS: Patient[] = [];

const CATEGORIES: (MedicineCategory | "All")[] = [
  "All", "Antimalarial", "Antibiotic", "Analgesic",
  "Antidiabetic", "Antihypertensive", "Antiparasitic",
  "GI/Gastro", "Antiretroviral", "Cardiovascular", "Other",
];

export default function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MedicineCategory | "All">("All");
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MEDICINES.filter((m) => {
      const matchesSearch =
        !q ||
        m.genericName.toLowerCase().includes(q) ||
        m.brandNames.some((b) => b.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const selectedPatient = useMemo(
    () => PATIENTS.find((p) => p.id === selectedPatientId),
    [selectedPatientId]
  );

  const medicineIntel = useMemo(() => {
    if (!selectedMedicine || !selectedPatient) return null;
    return scoreMedicineForPatient(selectedMedicine, selectedPatient);
  }, [selectedMedicine, selectedPatient]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Medicine Intelligence"
        subtitle="Search, score, and compare medicines with availability intelligence"
        icon={<Pill className="w-5 h-5" />}
      />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by generic name, brand, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
          />
        </div>
        <select
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        >
          <option value="">Score for patient... (optional)</option>
          {PATIENTS.map((p) => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </select>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.slice(0, 8).map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              selectedCategory === c
                ? "bg-farumasi-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Medicine list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="py-16 text-center bg-white rounded-xl border border-slate-100">
              <Pill className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No medicines match your search</p>
            </div>
          )}
          {filtered.map((medicine) => {
            const intel = selectedPatient ? scoreMedicineForPatient(medicine, selectedPatient) : null;
            const isSelected = selectedMedicine?.id === medicine.id;

            return (
              <button
                key={medicine.id}
                onClick={() => setSelectedMedicine(isSelected ? null : medicine)}
                className={`w-full text-left bg-white rounded-xl border shadow-sm p-5 transition-all ${
                  isSelected
                    ? "border-farumasi-300 ring-1 ring-farumasi-200"
                    : "border-slate-100 hover:border-farumasi-200 hover:shadow-md"
                }`}
              >
                {/* Medicine header */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-farumasi-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {medicine.genericName} {medicine.strength}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {medicine.dosageForm} · {medicine.category}
                        </p>
                        {medicine.brandNames.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Brands: {medicine.brandNames.join(", ")}
                          </p>
                        )}
                      </div>
                      {intel && (
                        <div className={`rounded-lg px-2.5 py-1 text-center flex-shrink-0 ${getScoreBgColor(intel.overallScore)}`}>
                          <p className="text-[10px]">Score</p>
                          <p className="text-sm font-bold">{intel.overallScore}</p>
                        </div>
                      )}
                    </div>

                    {/* Price range */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">
                        {formatRWF(medicine.priceRange.min)} – {formatRWF(medicine.priceRange.max)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        medicine.isEssentialMedicine ? "bg-farumasi-50 text-farumasi-700" : "bg-slate-50 text-slate-600"
                      }`}>
                        {medicine.isEssentialMedicine ? "Essential Medicine" : "Non-Essential"}
                      </span>
                      {medicine.requiresPrescription && (
                        <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Rx Only</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Availability matrix */}
                <div className="mt-4">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">Stock Availability</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {medicine.availability.map((a) => (
                      <div key={a.pharmacyId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] text-slate-600 truncate">{a.pharmacyName.split(" ")[0]} {a.pharmacyName.split(" ")[1]}</span>
                        </div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getStockBg(a.stockLevel)}`}>
                          {a.stockLevel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings from intel */}
                {intel && intel.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {intel.warnings.slice(0, 1).map((w) => (
                      <div key={w.id} className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {w.title}
                      </div>
                    ))}
                    {intel.warnings.length > 1 && (
                      <p className="text-[10px] text-slate-400 mt-1">+{intel.warnings.length - 1} more alerts</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Detail panel */}
        <div className="space-y-4">
          {!selectedMedicine ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 text-center">
              <Brain className="w-8 h-8 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Select a medicine</p>
              <p className="text-xs text-slate-400 mt-1">Click any medicine to see detailed analysis</p>
            </div>
          ) : (
            <>
              {/* Medicine detail */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-farumasi-100 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-farumasi-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedMedicine.genericName}</p>
                    <p className="text-xs text-slate-500">{selectedMedicine.strength} · {selectedMedicine.dosageForm}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <InfoRow label="Category" value={selectedMedicine.category} />
                  <InfoRow label="Brands" value={selectedMedicine.brandNames.join(", ") || "—"} />
                  <InfoRow label="Price Range" value={`${formatRWF(selectedMedicine.priceRange.min)} – ${formatRWF(selectedMedicine.priceRange.max)}`} />
                  <InfoRow label="Allergy Class" value={selectedMedicine.allergyClass.join(", ") || "—"} />
                  <InfoRow label="Insurance Coverage" value={selectedMedicine.insuranceCovered.join(", ") || "None"} />
                </div>

                {selectedMedicine.contraindications.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-red-600 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Contraindications
                    </p>
                    <ul className="space-y-1">
                      {selectedMedicine.contraindications.map((c) => (
                        <li key={c} className="text-xs text-red-600 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMedicine.commonSideEffects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-amber-600 mb-2">Common Side Effects</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedMedicine.commonSideEffects.map((s) => (
                        <span key={s} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Intelligence scores (if patient selected) */}
              {medicineIntel && selectedPatient && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-farumasi-600" />
                      <h3 className="text-sm font-semibold text-slate-800">Intelligence Scores</h3>
                    </div>
                    <span className="text-xs text-slate-400">For {selectedPatient.fullName.split(" ")[0]}</span>
                  </div>

                  <div className="space-y-2.5 mb-4">
                    {[
                      { label: "Safety", value: medicineIntel.safetyScore },
                      { label: "Availability", value: medicineIntel.availabilityScore },
                      { label: "Insurance", value: medicineIntel.insuranceScore },
                      { label: "Affordability", value: medicineIntel.affordabilityScore },
                    ].map((s) => (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">{s.label}</span>
                          <span className={`font-semibold ${s.value >= 80 ? "text-green-600" : s.value >= 50 ? "text-amber-600" : "text-red-600"}`}>{s.value}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.value >= 80 ? "bg-green-500" : s.value >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${s.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={`rounded-lg px-3 py-2 text-center ${getScoreBgColor(medicineIntel.overallScore)}`}>
                    <p className="text-xs text-slate-600">Overall Score</p>
                    <p className="text-2xl font-bold">{medicineIntel.overallScore}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Intelligence score</p>
                  </div>

                  {medicineIntel.warnings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {medicineIntel.warnings.map((w) => (
                        <div key={w.id} className={`rounded-lg px-3 py-2.5 flex gap-2 text-xs ${
                          w.severity === "Critical" ? "bg-red-50" :
                          w.severity === "Warning" ? "bg-amber-50" : "bg-blue-50"
                        }`}>
                          <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                            w.severity === "Critical" ? "text-red-600" :
                            w.severity === "Warning" ? "text-amber-600" : "text-blue-600"
                          }`} />
                          <div>
                            <p className="font-medium text-slate-800">{w.title}</p>
                            <p className="text-slate-600 mt-0.5">{w.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Insurance coverage table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-farumasi-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Insurance Coverage</h3>
                </div>
                {selectedMedicine.insuranceCovered.length === 0 ? (
                  <p className="text-xs text-slate-400">Not covered by any insurer</p>
                ) : (
                  <div className="space-y-2">
                {(["RSSB", "MMI", "RAMA", "Radiant", "Britam"] as const).map((ins) => {
                      const covered = (selectedMedicine.insuranceCovered as string[]).includes(ins);
                      return (
                        <div key={ins} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">{ins}</span>
                          {covered ? (
                            <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Covered
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Not covered</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 min-w-[90px]">{label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}
