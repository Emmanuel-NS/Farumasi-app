"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mockRequests } from "@/data/mock";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, timeAgo, formatDateTime } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle, FileText, Clock, Send, Phone } from "lucide-react";
import { toast } from "sonner";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [requests, setRequests] = useState(mockRequests);
  const [notes, setNotes] = useState("");

  const req = requests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Request not found.</p>
        <button onClick={() => router.back()} className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Go Back
        </button>
      </div>
    );
  }

  const updateStatus = (newStatus: typeof req.status) => {
    setRequests((p) => p.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    toast.success(`Request ${newStatus === "accepted" ? "accepted" : newStatus === "rejected" ? "rejected" : "updated"} successfully`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Request #{req.id}</p>
          <h1 className="text-xl font-extrabold text-slate-900">{req.patientName}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
            <Phone className="w-3.5 h-3.5" />
            {req.patientPhone}
          </p>
        </div>
        <StatusBadge status={req.status} type="request" />
      </div>

      {/* Timeline badges */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-3.5">
          <p className="text-xs text-slate-500 mb-0.5">Broadcast</p>
          <p className="text-sm font-semibold text-slate-900">{formatDateTime(req.broadcastAt)}</p>
        </div>
        <div className={`rounded-2xl border p-3.5 ${req.status === "broadcast" ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100"}`}>
          <p className="text-xs text-slate-500 mb-0.5">Expires</p>
          <p className="text-sm font-semibold text-slate-900">{formatDateTime(req.expiresAt)}</p>
        </div>
      </div>

      {/* Prescription image placeholder */}
      {req.prescriptionImageUrl && (
        <div className="mb-5 rounded-2xl overflow-hidden">
          <img src={req.prescriptionImageUrl} alt="Prescription" className="w-full rounded-2xl" />
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-farumasi-600" />
          Prescription Items
        </h2>
        <div className="space-y-2.5">
          {req.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{formatPrice(item.unitPrice)} RWF</p>
                <p className="text-xs text-slate-500">× {item.quantity} = {formatPrice(item.unitPrice * item.quantity)} RWF</p>
              </div>
            </div>
          ))}
          <div className="pt-2 flex justify-between border-t border-slate-100">
            <p className="text-sm font-bold text-slate-900">Total</p>
            <p className="text-base font-extrabold text-farumasi-700">{formatPrice(req.totalAmount)} RWF</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <label className="block text-sm font-bold text-slate-700 mb-2">Notes to Patient (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. We've verified availability. Invoice will be sent shortly."
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all resize-none"
        />
      </div>

      {/* Actions */}
      {req.status === "broadcast" && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus("rejected")}
            className="flex-1 h-12 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
          <button
            onClick={() => updateStatus("accepted")}
            className="flex-1 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Accept Request
          </button>
        </div>
      )}

      {req.status === "accepted" && (
        <button
          onClick={() => updateStatus("invoice_sent")}
          className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          Send Invoice to Patient
        </button>
      )}

      {req.status === "invoice_sent" && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-blue-700 font-semibold text-sm">Invoice sent. Waiting for patient confirmation.</p>
        </div>
      )}

      {req.status === "patient_confirmed" && (
        <div className="bg-farumasi-50 border border-farumasi-100 rounded-2xl p-4 text-center">
          <p className="text-farumasi-700 font-semibold text-sm flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Patient confirmed. Prepare order for delivery.
          </p>
        </div>
      )}
    </div>
  );
}
