"use client";
import { useState, useMemo } from "react";
import {
  ArrowLeftRight, Pill, TrendingDown, TrendingUp,
  Shield, CheckCircle2, AlertTriangle, Info,
  DollarSign, Package, Filter,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockAlternatives, mockMedicines } from "@/data/mock";
import { cn, formatRWF } from "@/lib/utils";
import type { MedicineAlternative, AlternativeReason } from "@/types";

const REASON_CONFIG: Record<AlternativeReason, { label: string; color: string; bg: string }> = {
  Generic: { label: "Generic Equivalent", color: "text-farumasi-700", bg: "bg-farumasi-50" },
  TherapeuticEquivalent: { label: "Therapeutic Equivalent", color: "text-blue-700", bg: "bg-blue-50" },
  StockSubstitution: { label: "Stock Substitution", color: "text-amber-700", bg: "bg-amber-50" },
  CostOptimization: { label: "Cost Optimization", color: "text-green-700", bg: "bg-green-50" },
  InsuranceCoverage: { label: "Insurance Coverage", color: "text-purple-700", bg: "bg-purple-50" },
};

const EQUIVALENCE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  Exact: { label: "Exact Equivalent", icon: CheckCircle2, color: "text-green-700" },
  Equivalent: { label: "Therapeutically Equivalent", icon: CheckCircle2, color: "text-teal-700" },
  Similar: { label: "Similar Mechanism", icon: Info, color: "text-amber-700" },
};

const INSURANCE_DIFF: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  Better: { icon: TrendingUp, color: "text-green-700", label: "Better Coverage" },
  Same: { icon: CheckCircle2, color: "text-slate-600", label: "Same Coverage" },
  Worse: { icon: TrendingDown, color: "text-red-600", label: "Worse Coverage" },
};

const REASONS: (AlternativeReason | "all")[] = [
  "all", "Generic", "TherapeuticEquivalent", "StockSubstitution", "CostOptimization", "InsuranceCoverage"
];

export default function AlternativesPage() {
  const [reasonFilter, setReasonFilter] = useState<AlternativeReason | "all">("all");
  const [equivalenceFilter, setEquivalenceFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockAlternatives.filter((a) => {
      const matchReason = reasonFilter === "all" || a.reason === reasonFilter;
      const matchEquiv = equivalenceFilter === "all" || a.equivalenceLevel === equivalenceFilter;
      return matchReason && matchEquiv;
    });
  }, [reasonFilter, equivalenceFilter]);

  const getMedicine = (id: string) => mockMedicines.find((m) => m.id === id);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Alternative Medicines"
        subtitle="Substitution guidance — generics, therapeutic equivalents, and cost-optimized alternatives"
        icon={<ArrowLeftRight className="w-5 h-5" />}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Pairs", value: mockAlternatives.length, color: "text-slate-800" },
          { label: "Generic Equivalents", value: mockAlternatives.filter((a) => a.reason === "Generic").length + 1, color: "text-farumasi-700" },
          { label: "Cost Savings Available", value: mockAlternatives.filter((a) => a.costDifference < 0).length, color: "text-green-700" },
          { label: "Therapeutic Equiv.", value: mockAlternatives.filter((a) => a.equivalenceLevel !== "Similar").length, color: "text-blue-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Reason filter */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 flex-wrap">
          {REASONS.map((r) => {
            const cfg = r !== "all" ? REASON_CONFIG[r] : null;
            return (
              <button
                key={r}
                onClick={() => setReasonFilter(r)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                  reasonFilter === r
                    ? "bg-farumasi-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {r === "all" ? "All Reasons" : (cfg?.label ?? r).replace("Therapeutic Equivalent", "Therapeutic Equiv.")}
              </button>
            );
          })}
        </div>

        {/* Equivalence filter */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {["all", "Exact", "Equivalent", "Similar"].map((e) => (
            <button
              key={e}
              onClick={() => setEquivalenceFilter(e)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors",
                equivalenceFilter === e
                  ? "bg-farumasi-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {e === "all" ? "All Equivalence" : e}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison cards */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No alternatives match your filters</p>
          </div>
        )}
        {filtered.map((alt) => {
          const original = getMedicine(alt.originalMedicineId);
          const alternative = getMedicine(alt.alternativeMedicineId);
          const reasonCfg = REASON_CONFIG[alt.reason];
          const equivCfg = EQUIVALENCE_CONFIG[alt.equivalenceLevel];
          const insDiffCfg = INSURANCE_DIFF[alt.insuranceDifference];
          const EquivIcon = equivCfg?.icon ?? CheckCircle2;
          const InsDiffIcon = insDiffCfg?.icon ?? CheckCircle2;
          const costSaving = -alt.costDifference; // positive = cheaper alternative
          const isCheaper = alt.costDifference < 0;

          return (
            <div key={`${alt.originalMedicineId}-${alt.alternativeMedicineId}`}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Header bar */}
              <div className="px-5 pt-4 pb-3 border-b border-slate-50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", reasonCfg.bg, reasonCfg.color)}>
                    {reasonCfg.label}
                  </span>
                  <span className={cn("text-[10px] font-medium flex items-center gap-1", equivCfg?.color)}>
                    <EquivIcon className="w-3 h-3" />
                    {equivCfg?.label}
                  </span>
                </div>
                {isCheaper && (
                  <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">
                    <DollarSign className="w-3 h-3" />
                    <span className="text-xs font-semibold">Save ~{formatRWF(costSaving)} per course</span>
                  </div>
                )}
              </div>

              {/* Comparison columns */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-0">
                {/* Original */}
                <div className="p-5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Original</p>
                  {original ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{original.genericName}</p>
                        <p className="text-xs text-slate-500">{original.strength} · {original.dosageForm}</p>
                        <p className="text-[10px] text-slate-400">{original.brandNames.slice(0, 2).join(", ")}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <ComparisonChip
                          icon={DollarSign}
                          label={`${formatRWF(original.priceRange.min)}–${formatRWF(original.priceRange.max)}`}
                          color="text-slate-600"
                        />
                        <ComparisonChip
                          icon={Package}
                          label={`${original.availability.length} pharmacies`}
                          color="text-slate-600"
                        />
                        <ComparisonChip
                          icon={Shield}
                          label={`${original.insuranceCovered.length} insurers`}
                          color="text-slate-600"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{alt.originalMedicineId}</p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center justify-center px-3 py-5 sm:border-l sm:border-r border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-farumasi-50 border border-farumasi-100 flex items-center justify-center">
                    <ArrowLeftRight className="w-4 h-4 text-farumasi-600" />
                  </div>
                </div>

                {/* Alternative */}
                <div className="p-5 bg-farumasi-50/30">
                  <p className="text-[10px] font-semibold text-farumasi-600 uppercase tracking-wide mb-2">Alternative</p>
                  {alternative ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{alternative.genericName}</p>
                        <p className="text-xs text-slate-500">{alternative.strength} · {alternative.dosageForm}</p>
                        <p className="text-[10px] text-slate-400">{alternative.brandNames.slice(0, 2).join(", ")}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <ComparisonChip
                          icon={DollarSign}
                          label={`${formatRWF(alternative.priceRange.min)}–${formatRWF(alternative.priceRange.max)}`}
                          color={isCheaper ? "text-green-700" : "text-red-600"}
                        />
                        <ComparisonChip
                          icon={Package}
                          label={`${alternative.availability.length} pharmacies`}
                          color={alt.availabilityDifference >= 0 ? "text-green-700" : "text-amber-700"}
                        />
                        <ComparisonChip
                          icon={InsDiffIcon}
                          label={insDiffCfg?.label ?? "Same"}
                          color={insDiffCfg?.color ?? "text-slate-600"}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{alt.alternativeMedicineName}</p>
                  )}
                </div>
              </div>

              {/* Notes footer */}
              {alt.notes && (
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">{alt.notes}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComparisonChip({
  icon: Icon, label, color,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg font-medium", color)}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
