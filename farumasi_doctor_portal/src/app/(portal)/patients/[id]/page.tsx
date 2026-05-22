"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, FilePlus, Phone, MapPin, Calendar, Shield,
  AlertTriangle, Heart, Activity, Pill, Clock, FileText,
  User, NotebookPen,
} from "lucide-react";
import { patientsService, DerivedPatient } from "@/lib/services/patients.service";
import { prescriptionsService } from "@/lib/services/prescriptions.service";
import {
  formatDate, formatDateTime, getInitials,
  getPrescriptionStatusColor, timeAgo, calculateAge,
} from "@/lib/utils";
import type { Prescription, ClinicalNote } from "@/types";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<DerivedPatient | null>(null);
  const [patientRxs, setPatientRxs] = useState<Prescription[]>([]);
  const patientNotes: ClinicalNote[] = [];
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientsService.getPatients(),
      prescriptionsService.getAll({ limit: 100 }),
    ]).then(([pts, allRx]) => {
      setPatient(pts.find((p) => p.id === id) ?? null);
      setPatientRxs(allRx.filter((r) => r.patientId === id));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-farumasi-600 border-t-transparent" /></div>;
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <User className="w-12 h-12 text-slate-200" />
        <p className="text-sm text-slate-500">Patient not found</p>
        <Link href="/patients" className="text-xs text-farumasi-600 hover:underline">← Back to patients</Link>
      </div>
    );
  }

  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/patients" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Patients
        </Link>
        <Link
          href={`/prescriptions/new?patientId=${patient.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
        >
          <FilePlus className="w-4 h-4" />
          Write Prescription
        </Link>
      </div>

      {/* Patient header card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-farumasi-700">{getInitials(patient.fullName)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{patient.fullName}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {age !== null && <span className="text-sm text-slate-500">{age} years{patient.gender ? ` · ${patient.gender}` : ""}</span>}
                  {patient.dateOfBirth && <span className="text-sm text-slate-500">DOB: {formatDate(patient.dateOfBirth)}</span>}
                  {patient.nationalId && <span className="text-sm font-medium text-farumasi-700">NID: {patient.nationalId}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600`}>
                  {patient.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact + vital info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          {[
            { icon: Phone, label: "Phone", value: patient.phone },
            { icon: MapPin, label: "Address", value: "—" },
            { icon: Heart, label: "Blood Group", value: "—" },
            { icon: Activity, label: "Weight / Height", value: "—" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <div className="flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5 text-slate-400" />
                <p className="text-sm text-slate-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Allergies + Chronic conditions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-800">Allergies</h3>
          </div>
          {([] as string[]).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {([] as string[]).map((a) => (
                <span key={a} className="text-sm font-medium bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full">
                  ⚠ {a}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No documented allergies</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-800">Chronic Conditions</h3>
          </div>
          {([] as string[]).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {([] as string[]).map((c) => (
                <span key={c} className="text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No chronic conditions on file</p>
          )}
        </div>
      </div>

      {/* Prescription history */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-farumasi-600" />
            <h3 className="text-sm font-semibold text-slate-800">Prescription History</h3>
            <span className="text-xs text-slate-400">({patientRxs.length} total)</span>
          </div>
          <Link
            href={`/prescriptions/new?patientId=${patient.id}`}
            className="text-xs text-farumasi-600 font-medium hover:underline"
          >
            + New Rx
          </Link>
        </div>
        {patientRxs.length === 0 ? (
          <div className="py-10 text-center">
            <Pill className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No prescriptions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {patientRxs.map((rx) => (
              <Link
                key={rx.id}
                href={`/prescriptions/${rx.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-farumasi-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-farumasi-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{rx.prescriptionNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{rx.diagnosis}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {rx.items.length} item{rx.items.length !== 1 ? "s" : ""} · {rx.pharmacyName ?? "Pharmacy not assigned"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPrescriptionStatusColor(rx.status)}`}>
                    {rx.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(rx.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Notes */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-farumasi-600" />
            <h3 className="text-sm font-semibold text-slate-800">Clinical Notes</h3>
            <span className="text-xs text-slate-400">({patientNotes.length} notes)</span>
          </div>
          <Link href="/notes" className="text-xs text-farumasi-600 font-medium hover:underline">
            View all notes →
          </Link>
        </div>
        {patientNotes.length === 0 ? (
          <div className="py-10 text-center">
            <NotebookPen className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No clinical notes yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {patientNotes.map((note) => (
              <div key={note.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{note.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{note.noteType} · {formatDateTime(note.createdAt)}</p>
                  </div>
                </div>
                {note.subjective && (
                  <div className="mt-3 space-y-1.5">
                    <NoteSection label="S" content={note.subjective} />
                    {note.objective && <NoteSection label="O" content={note.objective} />}
                    {note.assessment && <NoteSection label="A" content={note.assessment} />}
                    {note.plan && <NoteSection label="P" content={note.plan} />}
                  </div>
                )}
                {note.content && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">{note.content}</p>
                )}
                {note.vitals && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {note.vitals.bp && <VitalChip label="BP" value={note.vitals.bp} />}
                    {note.vitals.temp && <VitalChip label="Temp" value={note.vitals.temp} />}
                    {note.vitals.pulse && <VitalChip label="HR" value={`${note.vitals.pulse} bpm`} />}
                    {note.vitals.spo2 && <VitalChip label="SpO2" value={`${note.vitals.spo2}%`} />}
                    {note.vitals.glucose && <VitalChip label="Glucose" value={`${note.vitals.glucose} mmol/L`} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NoteSection({ label, content }: { label: string; content: string }) {
  const colors: Record<string, string> = { S: "bg-blue-50 text-blue-800", O: "bg-slate-100 text-slate-700", A: "bg-amber-50 text-amber-800", P: "bg-green-50 text-green-800" };
  return (
    <div className="flex gap-2">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${colors[label] ?? ""}`}>{label}</span>
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{content}</p>
    </div>
  );
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
      {label}: <strong>{value}</strong>
    </span>
  );
}
