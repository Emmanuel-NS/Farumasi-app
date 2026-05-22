"use client";
import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Plus, Trash2, AlertTriangle,
  CheckCircle2, Shield, MapPin, TrendingUp, Brain,
  FilePlus, ChevronDown, ChevronUp, Info, Package,
  Pill, Clock,
} from "lucide-react";
import { scoreMedicineForPatient, recommendPharmaciesForItems } from "@/lib/intelligence";
import {
  calculateAge, getInitials, getInsuranceBadgeColor, getScoreBgColor,
  getStockBg, formatRWF, generatePrescriptionNumber,
} from "@/lib/utils";
import type { Patient, Medicine, PrescriptionItem } from "@/types";

const ALL_PATIENTS: Patient[] = [];
const ALL_MEDICINES: Medicine[] = [];

// ── Draft prescription item (in-progress) ────────────────────────────────────
interface DraftItem {
  medicine: Medicine;
  dose: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  substitutionAllowed: boolean;
}

const FREQ_OPTIONS = [
  "Once daily", "Twice daily", "3 times daily", "4 times daily",
  "Every 6 hours", "Every 8 hours", "Every 12 hours",
  "As needed (PRN)", "At bedtime",
];

const DURATION_OPTIONS = [
  "3 days", "5 days", "7 days", "10 days", "14 days",
  "21 days", "30 days", "60 days", "90 days", "Ongoing",
];

function NewPrescriptionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedPatientId = searchParams.get("patientId");

  const [step, setStep] = useState<"patient" | "medicines" | "review">("patient");

  // Patient selection
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    preselectedPatientId ? ALL_PATIENTS.find((p) => p.id === preselectedPatientId) ?? null : null
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Diagnosis
  const [diagnosis, setDiagnosis] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [icdCode, setIcdCode] = useState("");

  // Medicine search
  const [medSearch, setMedSearch] = useState("");
  const [showMedDropdown, setShowMedDropdown] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Draft items
  const [items, setItems] = useState<DraftItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  // New item form
  const [newItem, setNewItem] = useState({
    dose: "1",
    frequency: "Twice daily",
    duration: "7 days",
    quantity: 14,
    instructions: "",
    substitutionAllowed: true,
  });

  // Notes
  const [rxNotes, setRxNotes] = useState("");

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return ALL_PATIENTS.slice(0, 8);
    const q = patientSearch.toLowerCase();
    return ALL_PATIENTS.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.nationalId.includes(q) ||
        p.phone.includes(q)
    ).slice(0, 8);
  }, [patientSearch]);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    if (!medSearch) return ALL_MEDICINES.slice(0, 6);
    const q = medSearch.toLowerCase();
    return ALL_MEDICINES.filter(
      (m) =>
        m.genericName.toLowerCase().includes(q) ||
        m.brandNames.some((b) => b.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [medSearch]);

  // Intelligence for selected medicine
  const medicineIntel = useMemo(() => {
    if (!selectedMedicine || !selectedPatient) return null;
    return scoreMedicineForPatient(selectedMedicine, selectedPatient);
  }, [selectedMedicine, selectedPatient]);

  // Total estimated cost
  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const avail = item.medicine.availability[0];
      return sum + (avail ? avail.price * item.quantity : item.medicine.priceRange.min);
    }, 0);
  }, [items]);

  // Pharmacy recommendations for all items
  const pharmacyRecos = useMemo(() => {
    if (items.length === 0 || !selectedPatient) return [];
    // Simple: recommend based on availability of first medicine
    if (items[0]) {
      return recommendPharmaciesForItems([{ medicineId: items[0].medicine.id } as any], items[0].medicine);
    }
    return [];
  }, [items, selectedPatient]);

  const addMedicineToList = useCallback(() => {
    if (!selectedMedicine) return;
    const newDraftItem: DraftItem = {
      medicine: selectedMedicine,
      ...newItem,
    };
    setItems((prev) => [...prev, newDraftItem]);
    setSelectedMedicine(null);
    setMedSearch("");
    setNewItem({ dose: "1", frequency: "Twice daily", duration: "7 days", quantity: 14, instructions: "", substitutionAllowed: true });
    toast.success(`${selectedMedicine.genericName} added to prescription`);
  }, [selectedMedicine, newItem]);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedPatient || items.length === 0 || !diagnosis) {
      toast.error("Please complete all required fields");
      return;
    }
    const rxNum = generatePrescriptionNumber();
    toast.success(`Prescription ${rxNum} issued`, {
      description: `Sent to ${selectedPatient.fullName}. They'll be notified to view and order.`,
    });
    router.push("/prescriptions");
  }, [selectedPatient, items, diagnosis, router]);

  // ── Patient was preselected → skip to medicines step ─────────────────────
  const canProceedToMedicines = selectedPatient && diagnosis.length > 3 && chiefComplaint.length > 3;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/prescriptions" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-lg font-semibold text-slate-900">New Prescription</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {(["patient", "medicines", "review"] as const).map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">→</span>}
              <span className={`font-medium ${step === s ? "text-farumasi-600" : s < step ? "text-slate-400 line-through" : ""}`}>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Step 1: Patient & Diagnosis */}
      {step === "patient" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Patient search */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-farumasi-100 flex items-center justify-center">
                <span className="text-xs font-bold text-farumasi-700">1</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Select Patient</h2>
            </div>

            {selectedPatient ? (
              <SelectedPatientCard patient={selectedPatient} onClear={() => setSelectedPatient(null)} />
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patient by name, NID, phone..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute top-11 left-0 right-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto scrollbar-hide">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setShowPatientDropdown(false);
                          setPatientSearch("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-farumasi-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-farumasi-700">{getInitials(p.fullName)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{p.fullName}</p>
                          <p className="text-xs text-slate-400">{calculateAge(p.dateOfBirth)} y/o · {p.insurance} · {p.district}</p>
                          {p.allergies.length > 0 && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Allergies: {p.allergies.join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnosis */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-farumasi-100 flex items-center justify-center">
                <span className="text-xs font-bold text-farumasi-700">2</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Clinical Information</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Chief Complaint <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fever × 3 days, headache, chills"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Diagnosis / Clinical Impression <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Uncomplicated Malaria (P. falciparum)"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  ICD-10 Code <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. B50.9"
                  value={icdCode}
                  onChange={(e) => setIcdCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
              </div>
            </div>

            <button
              onClick={() => setStep("medicines")}
              disabled={!canProceedToMedicines}
              className="w-full bg-farumasi-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-farumasi-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Add Medicines →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Add Medicines */}
      {step === "medicines" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Medicine builder (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Patient reminder */}
            {selectedPatient && (
              <div className="bg-farumasi-50 border border-farumasi-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-farumasi-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-farumasi-800">{getInitials(selectedPatient.fullName)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-farumasi-900">{selectedPatient.fullName}</p>
                  <p className="text-xs text-farumasi-700">{diagnosis}</p>
                </div>
                {selectedPatient.allergies.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {selectedPatient.allergies.join(", ")}
                  </div>
                )}
              </div>
            )}

            {/* Medicine search */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Add Medicine</h3>

              {/* Medicine search box */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search generic name, brand, category..."
                  value={medSearch}
                  onChange={(e) => { setMedSearch(e.target.value); setShowMedDropdown(true); }}
                  onFocus={() => setShowMedDropdown(true)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                />
                {showMedDropdown && filteredMedicines.length > 0 && !selectedMedicine && (
                  <div className="absolute top-11 left-0 right-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto scrollbar-hide">
                    {filteredMedicines.map((m) => {
                      const intel = selectedPatient ? scoreMedicineForPatient(m, selectedPatient) : null;
                      const allergyAlert = selectedPatient?.allergies.some(a =>
                        m.allergyClass.map(c => c.toLowerCase()).includes(a.toLowerCase())
                      );
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedMedicine(m);
                            setMedSearch(m.genericName);
                            setShowMedDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-farumasi-50 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                            <Pill className="w-4 h-4 text-farumasi-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">{m.genericName} {m.strength}</p>
                              {allergyAlert && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                            <p className="text-xs text-slate-400">{m.dosageForm} · {m.category}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {m.availability.slice(0, 2).map((a) => (
                                <span key={a.pharmacyId} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStockBg(a.stockLevel)}`}>
                                  {a.stockLevel}
                                </span>
                              ))}
                            </div>
                          </div>
                          {intel && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getScoreBgColor(intel.overallScore)}`}>
                              {intel.overallScore}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dosage form */}
              {selectedMedicine && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-4 h-4 text-farumasi-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedMedicine.genericName} {selectedMedicine.strength}</p>
                      <p className="text-xs text-slate-400">{selectedMedicine.dosageForm} · {selectedMedicine.category}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Dose</label>
                      <input
                        type="text"
                        value={newItem.dose}
                        onChange={(e) => setNewItem({ ...newItem, dose: e.target.value })}
                        placeholder="e.g. 1 tablet"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Quantity</label>
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Frequency</label>
                      <select
                        value={newItem.frequency}
                        onChange={(e) => setNewItem({ ...newItem, frequency: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500 bg-white"
                      >
                        {FREQ_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Duration</label>
                      <select
                        value={newItem.duration}
                        onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500 bg-white"
                      >
                        {DURATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Patient Instructions</label>
                    <input
                      type="text"
                      value={newItem.instructions}
                      onChange={(e) => setNewItem({ ...newItem, instructions: e.target.value })}
                      placeholder="e.g. Take with food, avoid sunlight..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="substitution"
                      checked={newItem.substitutionAllowed}
                      onChange={(e) => setNewItem({ ...newItem, substitutionAllowed: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-farumasi-600 focus:ring-farumasi-500"
                    />
                    <label htmlFor="substitution" className="text-xs text-slate-600">Allow generic substitution</label>
                  </div>

                  <button
                    onClick={addMedicineToList}
                    className="w-full flex items-center justify-center gap-2 bg-farumasi-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-farumasi-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Prescription
                  </button>
                </div>
              )}
            </div>

            {/* Added medicines list */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Prescription Items ({items.length})
                  </h3>
                  <span className="text-xs text-slate-400">Est. cost: {formatRWF(totalCost)}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map((item, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center flex-shrink-0">
                          <Pill className="w-4 h-4 text-farumasi-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {item.medicine.genericName} {item.medicine.strength}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.dose} · {item.frequency} · {item.duration} · Qty: {item.quantity}
                          </p>
                          {item.instructions && (
                            <p className="text-xs text-slate-400 mt-0.5 italic">{item.instructions}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(i)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div className="px-5 pb-5">
                  <label className="text-xs font-medium text-slate-700 block mb-1">Prescription Notes</label>
                  <textarea
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    rows={2}
                    placeholder="Additional clinical notes..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-farumasi-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 px-5 pb-5">
                  <button
                    onClick={() => setStep("patient")}
                    className="flex-1 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 py-2.5 text-sm font-medium bg-farumasi-600 text-white rounded-lg hover:bg-farumasi-700 transition-colors"
                  >
                    Review & Submit →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Intelligence panel (2/5) */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI header */}
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-farumasi-400" />
                <span className="text-xs font-semibold text-white">AI-Assisted Intelligence</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Rule-based scoring only. Doctor makes all clinical decisions.
              </p>
            </div>

            {/* Medicine intelligence */}
            {medicineIntel && selectedMedicine && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-farumasi-600" />
                  {selectedMedicine.genericName} Analysis
                </h3>

                {/* Score bars */}
                <div className="space-y-2.5">
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
                          className={`h-full rounded-full transition-all ${s.value >= 80 ? "bg-green-500" : s.value >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${s.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Overall score */}
                <div className={`rounded-lg px-3 py-2 text-center ${getScoreBgColor(medicineIntel.overallScore)}`}>
                  <p className="text-xs text-slate-600">Overall Score</p>
                  <p className="text-2xl font-bold">{medicineIntel.overallScore}</p>
                </div>

                {/* Warnings */}
                {medicineIntel.warnings.length > 0 && (
                  <div className="space-y-2">
                    {medicineIntel.warnings.map((w) => (
                      <div
                        key={w.id}
                        className={`rounded-lg px-3 py-2.5 flex gap-2 ${
                          w.severity === "Critical" ? "bg-red-50 border border-red-100" :
                          w.severity === "Warning" ? "bg-amber-50 border border-amber-100" :
                          "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                          w.severity === "Critical" ? "text-red-600" :
                          w.severity === "Warning" ? "text-amber-600" :
                          "text-blue-600"
                        }`} />
                        <div>
                          <p className="text-xs font-medium text-slate-800">{w.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{w.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stock availability */}
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-2">Stock Availability</p>
                  <div className="space-y-1.5">
                    {selectedMedicine.availability.slice(0, 4).map((a) => (
                      <div key={a.pharmacyId} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 truncate">{a.pharmacyName.split("(")[0]}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getStockBg(a.stockLevel)}`}>
                            {a.stockLevel}
                          </span>
                          <span className="text-[10px] text-slate-400">{a.distanceKm}km</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pharmacy recommendations */}
            {pharmacyRecos.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-farumasi-600" />
                  Recommended Pharmacies
                </h3>
                <div className="space-y-2">
                  {pharmacyRecos.slice(0, 3).map((r, i) => (
                    <div key={r.pharmacy.id} className={`rounded-lg border p-3 ${i === 0 ? "border-farumasi-200 bg-farumasi-50" : "border-slate-100"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && <span className="text-[10px] font-bold text-farumasi-700 bg-farumasi-200 px-1.5 py-0.5 rounded">Best</span>}
                            <p className="text-xs font-semibold text-slate-800 truncate">{r.pharmacy.name}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{r.pharmacy.distanceKm}km · {r.pharmacy.fulfillmentRate}% fulfillment</p>
                          {r.pharmacy.isOpen24h && <p className="text-[10px] text-green-600 font-medium mt-0.5">Open 24h</p>}
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getScoreBgColor(r.totalScore)}`}>
                          {r.totalScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No medicine selected guidance */}
            {!selectedMedicine && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 text-center">
                <Pill className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Search for a medicine to see real-time intelligence</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && selectedPatient && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-800">Review Prescription</h2>
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">{generatePrescriptionNumber()}</span>
            </div>

            <div className="space-y-4">
              {/* Patient */}
              <div className="p-3 rounded-lg bg-farumasi-50 border border-farumasi-100">
                <p className="text-xs font-medium text-farumasi-700 mb-1">PATIENT</p>
                <p className="text-sm font-semibold text-slate-900">{selectedPatient.fullName}</p>
                <p className="text-xs text-slate-500">{calculateAge(selectedPatient.dateOfBirth)} y/o · {selectedPatient.insurance} · {selectedPatient.district}</p>
                {selectedPatient.allergies.length > 0 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Allergies: {selectedPatient.allergies.join(", ")}
                  </p>
                )}
              </div>

              {/* Diagnosis */}
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs font-medium text-slate-500 mb-1">DIAGNOSIS</p>
                <p className="text-sm text-slate-800">{diagnosis}</p>
                {chiefComplaint && <p className="text-xs text-slate-500 mt-1">{chiefComplaint}</p>}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">MEDICATIONS ({items.length})</p>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">{item.medicine.genericName} {item.medicine.strength}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.dose} · {item.frequency} · {item.duration} · Qty {item.quantity}</p>
                      {item.instructions && <p className="text-xs text-slate-400 mt-0.5 italic">{item.instructions}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <span className="text-sm text-slate-600">Estimated Total</span>
                <span className="text-sm font-bold text-slate-900">{formatRWF(totalCost)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("medicines")}
                className="flex-1 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50"
              >
                ← Edit
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 text-sm font-medium bg-farumasi-600 text-white rounded-lg hover:bg-farumasi-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Submit Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedPatientCard({ patient, onClear }: { patient: Patient; onClear: () => void }) {
  return (
    <div className="rounded-xl bg-farumasi-50 border border-farumasi-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-farumasi-200 flex items-center justify-center">
            <span className="text-sm font-bold text-farumasi-800">{getInitials(patient.fullName)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-farumasi-900">{patient.fullName}</p>
            <p className="text-xs text-farumasi-600">{calculateAge(patient.dateOfBirth)} y/o · {patient.gender} · {patient.insurance}</p>
            <p className="text-xs text-farumasi-500">{patient.district}, {patient.province}</p>
          </div>
        </div>
        <button onClick={onClear} className="text-xs text-farumasi-600 hover:text-farumasi-800 font-medium">Change</button>
      </div>
      {patient.allergies.length > 0 && (
        <div className="mt-3 pt-3 border-t border-farumasi-200">
          <p className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            ALLERGIES: {patient.allergies.join(", ")}
          </p>
        </div>
      )}
      {patient.chronicConditions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {patient.chronicConditions.map((c) => (
            <span key={c} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wrap in Suspense for useSearchParams ──────────────────────────────────────
export default function NewPrescriptionPage() {
  return (
    <Suspense>
      <NewPrescriptionInner />
    </Suspense>
  );
}
