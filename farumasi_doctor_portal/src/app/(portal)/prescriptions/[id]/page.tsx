"use client";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Pill, MapPin, Clock, Package, CheckCircle2,
  AlertTriangle, Phone, Calendar, Shield, User, ChevronRight,
  Send, XCircle,
} from "lucide-react";
import { mockPrescriptions, mockFulfillments, mockPatients } from "@/data/mock";
import {
  getPrescriptionStatusColor, getFulfillmentStatusColor,
  formatDate, formatDateTime, timeAgo, formatRWF,
} from "@/lib/utils";

export default function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const rx = mockPrescriptions.find((r) => r.id === id);
  const fulfillment = mockFulfillments.find((f) => f.prescriptionId === id);
  const patient = mockPatients.find((p) => rx && p.id === rx.patientId);

  if (!rx) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Pill className="w-12 h-12 text-slate-200" />
        <p className="text-sm text-slate-500">Prescription not found</p>
        <Link href="/prescriptions" className="text-xs text-farumasi-600 hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Link href="/prescriptions" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          Back to Prescriptions
        </Link>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPrescriptionStatusColor(rx.status)}`}>
          {rx.status}
        </span>
      </div>

      {/* Prescription header */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{rx.prescriptionNumber}</h1>
            <p className="text-sm text-slate-500 mt-1">{rx.diagnosis}</p>
            <p className="text-xs text-slate-400 mt-0.5">Chief complaint: {rx.chiefComplaint}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Written {formatDateTime(rx.createdAt)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Valid until {formatDate(rx.validUntil)}</p>
            {rx.icdCode && <p className="text-xs text-farumasi-600 font-medium mt-1">ICD: {rx.icdCode}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Patient info */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-farumasi-600" />
            <h3 className="text-sm font-semibold text-slate-800">Patient</h3>
          </div>
          <Link href={`/patients/${rx.patientId}`} className="group">
            <p className="text-sm font-semibold text-slate-900 group-hover:text-farumasi-600 transition-colors">
              {rx.patientName}
            </p>
          </Link>
          {patient && (
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-3 h-3" />
                Insurance: <span className="font-medium text-slate-700">{patient.insurance}</span>
              </div>
              {patient.allergies.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <AlertTriangle className="w-3 h-3" />
                  Allergies: {patient.allergies.join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pharmacy */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-farumasi-600" />
            <h3 className="text-sm font-semibold text-slate-800">Assigned Pharmacy</h3>
          </div>
          {rx.pharmacyName ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{rx.pharmacyName}</p>
              {fulfillment && (
                <p className="text-xs text-slate-500 mt-1">
                  {fulfillment.itemsFulfilled}/{fulfillment.itemsTotal} items fulfilled
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Not yet assigned</p>
          )}
        </div>
      </div>

      {/* Medication items */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">Medications ({rx.items.length})</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {rx.items.map((item, i) => (
            <div key={i} className="px-5 py-4 flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-farumasi-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Pill className="w-4 h-4 text-farumasi-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{item.genericName} {item.strength}</p>
                  <p className="text-xs text-slate-400">{item.medicineName}</p>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.dose} · {item.frequency} · {item.duration} · Qty: {item.quantity}
                </p>
                {item.instructions && (
                  <p className="text-xs text-slate-400 italic mt-0.5">{item.instructions}</p>
                )}
                {item.substitutionAllowed && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded mt-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Substitution allowed
                  </span>
                )}
              </div>
              {/* Fulfillment status */}
              {fulfillment && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getFulfillmentStatusColor(fulfillment.status)}`}>
                  {fulfillment.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fulfillment tracking */}
      {fulfillment && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Fulfillment Tracking</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getFulfillmentStatusColor(fulfillment.status)}`}>
              {fulfillment.status}
            </span>
          </div>

          <div className="space-y-3">
            {[
              { label: "Created", ts: fulfillment.createdAt, done: true },
              { label: "Dispatched", ts: fulfillment.dispatchedAt, done: !!fulfillment.dispatchedAt },
              { label: "Fulfilled", ts: fulfillment.fulfilledAt, done: !!fulfillment.fulfilledAt },
            ].map((step) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  step.done ? "bg-green-100" : "bg-slate-100"
                }`}>
                  {step.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    : <Clock className="w-3.5 h-3.5 text-slate-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{step.label}</p>
                  {step.ts && <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(step.ts)}</p>}
                </div>
              </div>
            ))}

            {fulfillment.substitutions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-blue-700 mb-1">Substitutions</p>
                {fulfillment.substitutions.map((s, i) => (
                  <p key={i} className="text-xs text-slate-500">{s.original} → {s.substituted}: {s.reason}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {rx.notes && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Clinical Notes</h3>
          <p className="text-sm text-slate-600">{rx.notes}</p>
        </div>
      )}
    </div>
  );
}
