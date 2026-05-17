"use client";
import { useState, useMemo } from "react";
import {
  ClipboardList, Calendar, User, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, Activity,
  ChevronDown, ChevronUp, Pill,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockPatients, mockPrescriptions } from "@/data/mock";
import { calculateAge, formatDate, cn } from "@/lib/utils";
import type { Patient } from "@/types";

// Inline treatment history derived from prescriptions + enriched patient context
const OUTCOME_COLORS: Record<string, string> = {
  Resolved: "bg-green-50 text-green-700 border-green-200",
  Improved: "bg-teal-50 text-teal-700 border-teal-200",
  Ongoing: "bg-blue-50 text-blue-700 border-blue-200",
  Worsened: "bg-red-50 text-red-700 border-red-200",
  Unknown: "bg-slate-50 text-slate-600 border-slate-200",
};

const OUTCOME_ICON: Record<string, React.ElementType> = {
  Resolved: CheckCircle2,
  Improved: TrendingUp,
  Ongoing: Clock,
  Worsened: AlertTriangle,
  Unknown: Activity,
};

// Synthetic treatment history built from mock prescriptions
const mockTreatments = [
  {
    id: "th-001",
    patientId: "pat-001",
    patientName: "Claudine Umwali",
    prescriptionId: "rx-001",
    visitDate: "2025-05-10",
    followUpDate: "2025-05-24",
    diagnosis: "Uncomplicated Malaria (Plasmodium falciparum)",
    icdCode: "B54",
    medicines: ["Artemether/Lumefantrine 20/120mg", "Paracetamol 500mg"],
    outcome: "Resolved",
    adherenceRate: 98,
    sideEffectsReported: [],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "Patient completed full 3-day course. RDT negative at follow-up.",
  },
  {
    id: "th-002",
    patientId: "pat-002",
    patientName: "Emmanuel Hakizimana",
    prescriptionId: "rx-002",
    visitDate: "2025-05-08",
    followUpDate: "2025-05-22",
    diagnosis: "Type 2 Diabetes Mellitus — HbA1c review",
    icdCode: "E11.9",
    medicines: ["Metformin 500mg", "Glibenclamide 5mg"],
    outcome: "Improved",
    adherenceRate: 82,
    sideEffectsReported: ["Mild GI upset (1st week)"],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "FBG reduced from 11.2 to 8.4 mmol/L. Continue current regimen.",
  },
  {
    id: "th-003",
    patientId: "pat-003",
    patientName: "Solange Ingabire",
    prescriptionId: "rx-003",
    visitDate: "2025-05-05",
    followUpDate: "2025-05-19",
    diagnosis: "Community-acquired Pneumonia (mild)",
    icdCode: "J18.9",
    medicines: ["Amoxicillin 500mg", "Ibuprofen 400mg"],
    outcome: "Resolved",
    adherenceRate: 100,
    sideEffectsReported: [],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "Full clinical resolution at day 10. Chest X-ray cleared.",
  },
  {
    id: "th-004",
    patientId: "pat-004",
    patientName: "Patrick Nzeyimana",
    prescriptionId: "rx-004",
    visitDate: "2025-04-28",
    followUpDate: "2025-05-12",
    diagnosis: "Essential Hypertension — Stage 1",
    icdCode: "I10",
    medicines: ["Amlodipine 5mg", "Enalapril 10mg"],
    outcome: "Ongoing",
    adherenceRate: 75,
    sideEffectsReported: ["Peripheral edema (mild)"],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "BP 148/92 at last visit. Target <130/80. Counselled on salt restriction.",
  },
  {
    id: "th-005",
    patientId: "pat-001",
    patientName: "Claudine Umwali",
    prescriptionId: "rx-005",
    visitDate: "2025-03-15",
    followUpDate: "2025-03-29",
    diagnosis: "Bacterial Tonsillitis",
    icdCode: "J03.9",
    medicines: ["Amoxicillin 500mg", "Ibuprofen 400mg"],
    outcome: "Resolved",
    adherenceRate: 100,
    sideEffectsReported: [],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "Cultures not done. Clinically resolved at day 7.",
  },
  {
    id: "th-006",
    patientId: "pat-005",
    patientName: "Alphonsine Mukamana",
    prescriptionId: "rx-006",
    visitDate: "2025-04-10",
    followUpDate: undefined,
    diagnosis: "HIV — Stable on ART (TDF/3TC/DTG regimen review)",
    icdCode: "B20",
    medicines: ["Tenofovir/Lamivudine/Dolutegravir 300/300/50mg"],
    outcome: "Ongoing",
    adherenceRate: 93,
    sideEffectsReported: [],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "VL undetectable. CD4 count 642. Continue current ART regimen.",
  },
  {
    id: "th-007",
    patientId: "pat-006",
    patientName: "Jean Bosco Nshimiyimana",
    prescriptionId: "rx-007",
    visitDate: "2025-04-01",
    followUpDate: "2025-04-15",
    diagnosis: "Severe Malaria — complicated, IV treatment",
    icdCode: "B50.0",
    medicines: ["IV Artesunate 60mg", "IV Quinine infusion", "Paracetamol 500mg"],
    outcome: "Improved",
    adherenceRate: 100,
    sideEffectsReported: ["Hypoglycemia episode on day 2"],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "Admitted for 4 days. Switched to oral artemether/lumefantrine at day 3. Full recovery.",
  },
  {
    id: "th-008",
    patientId: "pat-007",
    patientName: "Vestine Nyiraneza",
    prescriptionId: "rx-008",
    visitDate: "2025-03-20",
    followUpDate: "2025-04-03",
    diagnosis: "Pulmonary Tuberculosis — new case",
    icdCode: "A15.0",
    medicines: ["Rifampicin/Isoniazid/Pyrazinamide/Ethambutol (2RHZE)"],
    outcome: "Ongoing",
    adherenceRate: 88,
    sideEffectsReported: ["Nausea (first 2 weeks)", "Mild hepatotoxicity — monitored"],
    doctorName: "Dr. Jean Pierre Uwimana",
    notes: "Sputum smear positive → negative at 2 months. Currently in continuation phase.",
  },
];

export default function TreatmentPage() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return mockTreatments.filter((t) => {
      const matchPatient = selectedPatientId === "all" || t.patientId === selectedPatientId;
      const matchOutcome = outcomeFilter === "all" || t.outcome === outcomeFilter;
      return matchPatient && matchOutcome;
    });
  }, [selectedPatientId, outcomeFilter]);

  const OUTCOME_COUNTS = useMemo(() => ({
    all: mockTreatments.length,
    Resolved: mockTreatments.filter((t) => t.outcome === "Resolved").length,
    Improved: mockTreatments.filter((t) => t.outcome === "Improved").length,
    Ongoing: mockTreatments.filter((t) => t.outcome === "Ongoing").length,
    Worsened: mockTreatments.filter((t) => t.outcome === "Worsened").length,
  }), []);

  const OUTCOMES = ["all", "Resolved", "Improved", "Ongoing", "Worsened"] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Treatment History"
        subtitle="Full clinical episode history with outcomes and adherence tracking"
        icon={<ClipboardList className="w-5 h-5" />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Episodes", value: mockTreatments.length, color: "text-slate-800", bg: "bg-white" },
          { label: "Resolved", value: OUTCOME_COUNTS.Resolved, color: "text-green-700", bg: "bg-green-50" },
          { label: "Ongoing", value: OUTCOME_COUNTS.Ongoing, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Needs Review", value: OUTCOME_COUNTS.Worsened + 1, color: "text-amber-700", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 shadow-sm p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Patient filter */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-300 appearance-none min-w-[200px]"
          >
            <option value="all">All Patients</option>
            {mockPatients.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}</option>
            ))}
          </select>
        </div>

        {/* Outcome tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => setOutcomeFilter(o)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize",
                outcomeFilter === o
                  ? "bg-farumasi-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {o === "all" ? "All" : o}
              <span className="ml-1.5 text-[10px] opacity-70">
                {o === "all" ? OUTCOME_COUNTS.all : (OUTCOME_COUNTS as any)[o] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No treatment records found</p>
          </div>
        )}
        {filtered.map((treatment) => {
          const isExpanded = expandedId === treatment.id;
          const OutcomeIcon = OUTCOME_ICON[treatment.outcome] ?? Activity;
          const adherence = treatment.adherenceRate ?? 0;

          return (
            <div
              key={treatment.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <button
                className="w-full text-left p-5 hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : treatment.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        OUTCOME_COLORS[treatment.outcome]
                      )}>
                        <OutcomeIcon className="w-2.5 h-2.5 inline mr-1" />
                        {treatment.outcome}
                      </span>
                      {treatment.icdCode && (
                        <span className="text-[10px] text-slate-400 font-mono">{treatment.icdCode}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-tight">{treatment.diagnosis}</h3>
                    <p className="text-xs text-farumasi-600 font-medium mt-0.5">{treatment.patientName}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">{formatDate(treatment.visitDate)}</p>
                      {treatment.followUpDate && (
                        <p className="text-[10px] text-slate-400">Follow-up: {formatDate(treatment.followUpDate)}</p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>

                {/* Mini adherence bar */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-20 flex-shrink-0">Adherence</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        adherence >= 90 ? "bg-green-500" : adherence >= 70 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${adherence}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold w-9 text-right",
                    adherence >= 90 ? "text-green-700" : adherence >= 70 ? "text-amber-600" : "text-red-600"
                  )}>
                    {adherence}%
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                  {/* Medicines */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-farumasi-600" />
                      Medicines Prescribed
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {treatment.medicines.map((med) => (
                        <span key={med} className="text-xs bg-farumasi-50 text-farumasi-800 px-2 py-1 rounded-lg border border-farumasi-100">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Side effects */}
                  {treatment.sideEffectsReported.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Side Effects Reported
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {treatment.sideEffectsReported.map((se) => (
                          <span key={se} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg border border-amber-100">
                            {se}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clinical notes */}
                  {treatment.notes && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">Clinical Notes</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{treatment.notes}</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">Visit: {formatDate(treatment.visitDate)}</span>
                    </div>
                    {treatment.followUpDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-slate-500">Follow-up: {formatDate(treatment.followUpDate)}</span>
                      </div>
                    )}
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
