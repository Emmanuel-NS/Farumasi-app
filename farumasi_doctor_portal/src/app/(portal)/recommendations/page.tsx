"use client";
import { useState, useMemo } from "react";
import {
  Brain, AlertTriangle, AlertCircle, Info, Lightbulb,
  ShieldAlert, TrendingDown, DollarSign, Package,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockMedicines, mockPatients } from "@/data/mock";
import { cn } from "@/lib/utils";
import type { SmartRecommendation } from "@/types";

// Inline smart recommendations — derived from drug interaction analysis, allergy checks, stock status
const mockRecommendations: SmartRecommendation[] = [
  {
    id: "rec-001",
    type: "AllergyAlert",
    severity: "Critical",
    title: "Penicillin Allergy: Amoxicillin Contraindicated",
    description:
      "Patient Claudine Umwali has a documented Penicillin allergy. Amoxicillin is a penicillin-class antibiotic. Prescribing may cause an anaphylactic reaction. Use Cotrimoxazole or Azithromycin as alternatives.",
    actionLabel: "View Alternative Antibiotics",
    affectedMedicineIds: ["med-003"],
    isResolved: false,
    createdAt: "2025-05-11T08:14:00Z",
  },
  {
    id: "rec-002",
    type: "DrugInteraction",
    severity: "Warning",
    title: "Potential QT Prolongation: Quinine + Metformin",
    description:
      "Concurrent use of Quinine and Metformin may increase risk of QT interval prolongation in patients with existing cardiac risk factors. Monitor ECG and electrolytes closely. Consider artemether/lumefantrine as primary antimalarial.",
    actionLabel: "Review Prescription",
    affectedMedicineIds: ["med-006", "med-007"],
    isResolved: false,
    createdAt: "2025-05-10T11:45:00Z",
  },
  {
    id: "rec-003",
    type: "StockAlert",
    severity: "Warning",
    title: "Low Stock: Coartem (Artemether/Lumefantrine) at 2 Pharmacies",
    description:
      "Pharmacie Centrale de Kigali and Pharmacy of Good Hope report low stock levels for Artemether/Lumefantrine 20/120mg. Consider routing prescriptions to King Faisal Hospital Pharmacy or CHUK Pharmacy which have high stock.",
    actionLabel: "Check Availability",
    affectedMedicineIds: ["med-005"],
    isResolved: false,
    createdAt: "2025-05-11T06:00:00Z",
  },
  {
    id: "rec-004",
    type: "InsuranceOptimization",
    severity: "Info",
    title: "Insurance Optimization: Switch to Generic Metformin",
    description:
      "Patient Emmanuel Hakizimana's RSSB insurance fully covers generic Metformin 500mg. The current branded Glucophage is only 60% covered. Switching to the generic formulation reduces out-of-pocket cost by ~RWF 700 per refill with identical efficacy.",
    actionLabel: "View Coverage Details",
    affectedMedicineIds: ["med-007"],
    isResolved: true,
    resolvedBy: "Dr. Jean Pierre Uwimana",
    createdAt: "2025-05-09T14:22:00Z",
  },
  {
    id: "rec-005",
    type: "CostReduction",
    severity: "Suggestion",
    title: "Cost Reduction: Cotrimoxazole vs Amoxicillin for RTI",
    description:
      "For mild respiratory tract infections, Cotrimoxazole 480mg is 40% cheaper (RWF 500–900 vs RWF 1200–1500) and has comparable efficacy in the Rwandan resistance profile. Verify patient has no Sulfa allergy before switching.",
    actionLabel: "Compare Options",
    affectedMedicineIds: ["med-003", "med-004"],
    isResolved: false,
    createdAt: "2025-05-08T09:10:00Z",
  },
  {
    id: "rec-006",
    type: "DosageCheck",
    severity: "Warning",
    title: "Renal Function Check Required: Metformin in Elderly Patient",
    description:
      "Patient Patrick Nzeyimana (age 71) is prescribed Metformin. Current guidelines recommend dose reduction or discontinuation if eGFR < 45 mL/min. Confirm latest creatinine/eGFR before next refill.",
    actionLabel: "View Patient Labs",
    affectedMedicineIds: ["med-007"],
    isResolved: false,
    createdAt: "2025-05-07T16:30:00Z",
  },
  {
    id: "rec-007",
    type: "AllergyAlert",
    severity: "Critical",
    title: "Sulfa Allergy: Cotrimoxazole Contraindicated",
    description:
      "Patient Jean Bosco Nshimiyimana has a documented Sulfa allergy. Cotrimoxazole (Septrin/Bactrim) is a sulfonamide antibiotic and must not be prescribed. Use Amoxicillin, Doxycycline, or Azithromycin as alternatives.",
    actionLabel: "Find Safe Alternative",
    affectedMedicineIds: ["med-004"],
    isResolved: false,
    createdAt: "2025-05-06T10:00:00Z",
  },
  {
    id: "rec-008",
    type: "StockAlert",
    severity: "Info",
    title: "Restocked: Amlodipine Available at All Network Pharmacies",
    description:
      "Amlodipine 5mg is now fully stocked at King Faisal, CHUK, Pharmacie Centrale, and Pharmacie Moderne. You may resume routing prescriptions to any network pharmacy.",
    actionLabel: "View Availability",
    affectedMedicineIds: ["med-009"],
    isResolved: true,
    resolvedBy: "System",
    createdAt: "2025-05-05T07:00:00Z",
  },
];

const SEV_CONFIG: Record<string, {
  icon: React.ElementType; bg: string; border: string; badge: string; label: string;
}> = {
  Critical: {
    icon: ShieldAlert,
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    label: "Critical",
  },
  Warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    label: "Warning",
  },
  Info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    label: "Info",
  },
  Suggestion: {
    icon: Lightbulb,
    bg: "bg-farumasi-50",
    border: "border-farumasi-200",
    badge: "bg-farumasi-100 text-farumasi-700",
    label: "Suggestion",
  },
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  DrugInteraction: AlertCircle,
  AllergyAlert: ShieldAlert,
  DosageCheck: Brain,
  StockAlert: Package,
  InsuranceOptimization: DollarSign,
  CostReduction: TrendingDown,
};

const SEVERITIES = ["all", "Critical", "Warning", "Info", "Suggestion"] as const;
const TYPES = ["all", "AllergyAlert", "DrugInteraction", "StockAlert", "DosageCheck", "InsuranceOptimization", "CostReduction"] as const;

export default function RecommendationsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(
    new Set(mockRecommendations.filter((r) => r.isResolved).map((r) => r.id))
  );

  const markResolved = (id: string) => {
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return mockRecommendations.filter((r) => {
      const isResolved = resolvedIds.has(r.id);
      if (!showResolved && isResolved) return false;
      const matchSev = severityFilter === "all" || r.severity === severityFilter;
      const matchType = typeFilter === "all" || r.type === typeFilter;
      return matchSev && matchType;
    });
  }, [severityFilter, typeFilter, showResolved, resolvedIds]);

  const unresolvedCount = mockRecommendations.filter((r) => !resolvedIds.has(r.id)).length;
  const criticalCount = mockRecommendations.filter((r) => r.severity === "Critical" && !resolvedIds.has(r.id)).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Smart Recommendations"
        subtitle="Rule-based clinical decision support — allergy alerts, drug interactions, cost optimization"
        icon={<Brain className="w-5 h-5" />}
        actions={
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-3.5 h-3.5 accent-farumasi-600"
            />
            <span className="text-xs text-slate-600">Show resolved</span>
          </label>
        }
      />

      {/* AI disclaimer */}
      <div className="flex items-start gap-3 bg-slate-800 text-slate-200 rounded-xl p-4">
        <Brain className="w-5 h-5 text-farumasi-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">AI-Assisted Decision Support</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            All recommendations are generated by deterministic rule-based scoring engines, not generative AI.
            They are advisory only — clinical judgment and patient context must guide all prescribing decisions.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Alerts", value: unresolvedCount, color: "text-slate-800" },
          { label: "Critical", value: criticalCount, color: "text-red-700" },
          { label: "Drug Interactions", value: mockRecommendations.filter((r) => r.type === "DrugInteraction").length, color: "text-amber-700" },
          { label: "Resolved", value: resolvedIds.size, color: "text-green-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Severity filter */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 flex-wrap">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize",
                severityFilter === s
                  ? "bg-farumasi-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {s === "all" ? "All Severity" : s}
            </button>
          ))}
        </div>

        {/* Type select */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-300"
        >
          <option value="all">All Types</option>
          {TYPES.slice(1).map((t) => (
            <option key={t} value={t}>{t.replace(/([A-Z])/g, " $1").trim()}</option>
          ))}
        </select>
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active recommendations matching these filters</p>
          </div>
        )}
        {filtered.map((rec) => {
          const isResolved = resolvedIds.has(rec.id);
          const cfg = SEV_CONFIG[rec.severity] ?? SEV_CONFIG.Info;
          const SevIcon = cfg.icon;
          const TypeIcon = TYPE_ICONS[rec.type] ?? Brain;

          return (
            <div
              key={rec.id}
              className={cn(
                "rounded-xl border shadow-sm p-5 transition-opacity",
                isResolved ? "opacity-60 bg-slate-50 border-slate-200" : `${cfg.bg} ${cfg.border}`
              )}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", isResolved ? "bg-slate-200" : cfg.badge)}>
                    <SevIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", isResolved ? "bg-slate-200 text-slate-600" : cfg.badge)}>
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-white/60 px-2 py-0.5 rounded-full border border-slate-200">
                        <TypeIcon className="w-3 h-3" />
                        {rec.type.replace(/([A-Z])/g, " $1").trim()}
                      </div>
                      {isResolved && (
                        <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Resolved {rec.resolvedBy && `· ${rec.resolvedBy}`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight">{rec.title}</h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{rec.description}</p>

                    {/* Affected medicines */}
                    {rec.affectedMedicineIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rec.affectedMedicineIds.map((id) => {
                          const med = mockMedicines.find((m) => m.id === id);
                          return med ? (
                            <span key={id} className="text-[10px] bg-white/80 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              {med.genericName} {med.strength}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isResolved && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => markResolved(rec.id)}
                      className="text-xs text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                    {rec.actionLabel && (
                      <button className="text-xs bg-farumasi-600 text-white px-3 py-1.5 rounded-lg hover:bg-farumasi-700 transition-colors flex items-center gap-1">
                        {rec.actionLabel}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
