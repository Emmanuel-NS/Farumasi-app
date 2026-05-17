"use client";
import { useState, useMemo } from "react";
import {
  FileText, Printer, Download, User, Calendar,
  Pill, Building2, Shield, Search, Filter, ChevronDown,
  ClipboardList, Hash,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockPrescriptions, mockPatients, mockDoctor } from "@/data/mock";
import { formatDate, formatRWF, getPrescriptionStatusColor } from "@/lib/utils";
import type { Prescription } from "@/types";

// ── Print styles injected on demand ──────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #rx-print-area, #rx-print-area * { visibility: visible !important; }
  #rx-print-area { position: fixed; inset: 0; background: white; padding: 32px; }
}
`;

export default function ReportsPage() {
  const [selectedRxId, setSelectedRxId] = useState<string>(mockPrescriptions[0]?.id ?? "");
  const [reportType, setReportType] = useState<"prescription" | "patient-summary">("prescription");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPrescriptions = useMemo(() => {
    const q = search.toLowerCase();
    return mockPrescriptions.filter((rx) => {
      const matchSearch =
        !q ||
        rx.patientName.toLowerCase().includes(q) ||
        rx.prescriptionNumber.toLowerCase().includes(q) ||
        rx.diagnosis.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || rx.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const selectedRx = mockPrescriptions.find((r) => r.id === selectedRxId);
  const selectedPatient = selectedRx
    ? mockPatients.find((p) => p.id === selectedRx.patientId)
    : undefined;

  const handlePrint = () => {
    const style = document.createElement("style");
    style.textContent = PRINT_STYLE;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 2000);
  };

  const STATUSES = ["all", "Pending", "Sent", "PartiallyFulfilled", "Fulfilled", "Expired"];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reports & Print"
        subtitle="Printable prescription templates, patient summaries, and export tools"
        icon={<FileText className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!selectedRx}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-farumasi-600 text-white hover:bg-farumasi-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        }
      />

      {/* Report type tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {[
          { val: "prescription", label: "Prescription Template" },
          { val: "patient-summary", label: "Patient Summary" },
        ].map((t) => (
          <button
            key={t.val}
            onClick={() => setReportType(t.val as any)}
            className={`text-xs font-medium px-4 py-2 rounded-md transition-colors ${
              reportType === t.val
                ? "bg-farumasi-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left panel — selector */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700">Select Prescription</p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by patient, Rx #..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-farumasi-300"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-farumasi-300"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>
              ))}
            </select>

            {/* List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-hide">
              {filteredPrescriptions.map((rx) => (
                <button
                  key={rx.id}
                  onClick={() => setSelectedRxId(rx.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedRxId === rx.id
                      ? "bg-farumasi-50 border-farumasi-200"
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{rx.patientName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{rx.prescriptionNumber}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getPrescriptionStatusColor(rx.status)}`}>
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{rx.diagnosis}</p>
                </button>
              ))}
              {filteredPrescriptions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No prescriptions found</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {selectedRx && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Quick Stats</p>
              <div className="space-y-1.5">
                <StatRow label="Items" value={String(selectedRx.items.length)} />
                <StatRow
                  label="Est. Cost"
                  value={formatRWF(selectedRx.items.reduce((s, i) => s + i.estimatedCostRWF, 0))}
                />
                <StatRow
                  label="Valid Until"
                  value={formatDate(selectedRx.validUntil)}
                />
                <StatRow label="Status" value={selectedRx.status} />
              </div>
            </div>
          )}
        </div>

        {/* Right panel — printable preview */}
        <div>
          {!selectedRx ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a prescription to preview</p>
            </div>
          ) : reportType === "prescription" ? (
            <PrescriptionPrint rx={selectedRx} />
          ) : (
            <PatientSummaryPrint rx={selectedRx} patient={selectedPatient} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Prescription Print Template ───────────────────────────────────────────────
function PrescriptionPrint({ rx }: { rx: Prescription }) {
  const totalCost = rx.items.reduce((s, i) => s + i.estimatedCostRWF, 0);

  return (
    <div
      id="rx-print-area"
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-farumasi-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">FARUMASI</h1>
            <p className="text-farumasi-100 text-xs">Electronic Prescription System · Rwanda</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold font-mono">{rx.prescriptionNumber}</p>
            <p className="text-farumasi-100 text-xs">Issued: {formatDate(rx.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Doctor + Facility */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Prescribing Physician</p>
            <p className="text-sm font-bold text-slate-900">{rx.doctorName}</p>
            <p className="text-xs text-slate-500">{rx.facilityName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Valid Until</p>
            <p className="text-sm font-bold text-slate-900">{formatDate(rx.validUntil)}</p>
            <p className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${getPrescriptionStatusColor(rx.status)}`}>
              {rx.status}
            </p>
          </div>
        </div>

        {/* Patient */}
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <User className="w-3 h-3" /> Patient Details
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <InfoCell label="Full Name" value={rx.patientName} />
            <InfoCell label="Prescription #" value={rx.prescriptionNumber} />
            {rx.pharmacyName && <InfoCell label="Pharmacy" value={rx.pharmacyName} />}
          </div>
        </div>

        {/* Diagnosis */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Diagnosis</p>
          <p className="text-sm font-semibold text-slate-900">{rx.diagnosis}</p>
          {rx.icdCode && <p className="text-[10px] text-slate-400 font-mono">ICD-10: {rx.icdCode}</p>}
          {rx.chiefComplaint && <p className="text-xs text-slate-600 mt-1">Chief Complaint: {rx.chiefComplaint}</p>}
        </div>

        {/* Medications table */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Pill className="w-3 h-3" /> Prescribed Medications
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold">Medicine</th>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold hidden sm:table-cell">Dose / Frequency</th>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold hidden sm:table-cell">Duration</th>
                  <th className="text-right px-3 py-2 text-slate-600 font-semibold">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {rx.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{item.medicineName}</p>
                      <p className="text-slate-500">{item.strength} · {item.dosageForm}</p>
                      {item.instructions && (
                        <p className="text-slate-400 italic text-[10px]">{item.instructions}</p>
                      )}
                      {item.substitutionAllowed && (
                        <p className="text-[10px] text-teal-600">Generic substitution permitted</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 hidden sm:table-cell">
                      <p>{item.dose}</p>
                      <p className="text-slate-400">{item.frequency}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 hidden sm:table-cell">{item.duration}</td>
                    <td className="px-3 py-2.5 text-right">
                      <p className="font-semibold text-slate-800">{formatRWF(item.estimatedCostRWF)}</p>
                      {item.insuranceCovered && (
                        <p className="text-[10px] text-green-600 flex items-center gap-0.5 justify-end">
                          <Shield className="w-2.5 h-2.5" /> Covered
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">Total Estimated Cost</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900">{formatRWF(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {rx.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-amber-700 mb-1">Prescriber Notes</p>
            <p className="text-xs text-amber-800">{rx.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="w-40 h-0.5 border-b border-slate-400 mb-1" />
            <p className="text-[10px] text-slate-500">Physician Signature</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{rx.doctorName}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Electronic prescription — valid with QR verification</p>
            <p className="text-[10px] text-slate-400">FARUMASI · farumasi.rw</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Patient Summary Print ─────────────────────────────────────────────────────
function PatientSummaryPrint({ rx, patient }: { rx: Prescription; patient: typeof mockPatients[number] | undefined }) {
  const allRxForPatient = mockPrescriptions.filter((r) => r.patientId === rx.patientId);

  return (
    <div id="rx-print-area" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 px-6 py-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold">Patient Clinical Summary</h1>
            <p className="text-slate-400 text-xs">FARUMASI · Generated {formatDate(new Date().toISOString())}</p>
          </div>
          {patient && (
            <div className="text-right">
              <p className="text-sm font-bold">{patient.fullName}</p>
              <p className="text-slate-400 text-xs">NID: {patient.nationalId}</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {patient ? (
          <>
            {/* Demographics */}
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Demographics</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <InfoCell label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
                <InfoCell label="Gender" value={patient.gender} />
                <InfoCell label="Blood Group" value={patient.bloodGroup} />
                <InfoCell label="Insurance" value={patient.insurance} />
                <InfoCell label="Phone" value={patient.phone} />
                <InfoCell label="District" value={patient.district} />
                {patient.weight && <InfoCell label="Weight" value={`${patient.weight} kg`} />}
                {patient.height && <InfoCell label="Height" value={`${patient.height} cm`} />}
              </div>
            </div>

            {/* Allergies */}
            {patient.allergies.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">Known Allergies</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <span key={a} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-medium">
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Chronic conditions */}
            {patient.chronicConditions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions.map((c) => (
                    <span key={c} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">Patient data not available</p>
        )}

        {/* Prescription history */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <ClipboardList className="w-3 h-3" />
            Prescription History ({allRxForPatient.length} records)
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold">Rx #</th>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold">Diagnosis</th>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold hidden sm:table-cell">Date</th>
                  <th className="text-left px-3 py-2 text-slate-600 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {allRxForPatient.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.prescriptionNumber}</td>
                    <td className="px-3 py-2 text-slate-700">{r.diagnosis}</td>
                    <td className="px-3 py-2 text-slate-500 hidden sm:table-cell">{formatDate(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getPrescriptionStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">Confidential patient record — FARUMASI Electronic Health System · farumasi.rw</p>
        </div>
      </div>
    </div>
  );
}

// ── Shared helper components ──────────────────────────────────────────────────
function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 font-medium">{label}</p>
      <p className="text-xs text-slate-800 font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}
