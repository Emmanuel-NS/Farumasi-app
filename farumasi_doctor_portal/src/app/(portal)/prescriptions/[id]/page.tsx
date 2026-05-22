"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Pill, MapPin, Clock, Package, CheckCircle2,
  AlertTriangle, Phone, Calendar, Shield, User, ChevronRight,
  Send, XCircle,
} from "lucide-react";
import { prescriptionsService } from "@/lib/services/prescriptions.service";
import {
  getPrescriptionStatusColor, getFulfillmentStatusColor,
  formatDate, formatDateTime, timeAgo, formatRWF,
} from "@/lib/utils";
import type { Prescription } from "@/types";

export default function PrescriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prescriptionsService.getById(id)
      .then((data) => setRx(data))
      .catch(() => setRx(null))
      .finally(() => setLoading(false));
  }, [id]);

  const fulfillment = null; void fulfillment;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-farumasi-600 border-t-transparent" /></div>;
  }

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
            </div>
          ))}
        </div>
      </div>

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
