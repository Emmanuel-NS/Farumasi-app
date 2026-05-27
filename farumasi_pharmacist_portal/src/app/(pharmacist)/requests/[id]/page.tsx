"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { ArrowLeft, CheckCircle, XCircle, FileText, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  prescriptionsService,
  type BackendPrescription,
} from "@/lib/services/prescriptions.service";

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rx, setRx] = useState<BackendPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
      setRx(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (next: string) => {
    if (!rx) return;
    setActing(true);
    try {
      const updated = await prescriptionsService.updateStatus(rx.id, next);
      setRx(updated);
      toast.success(`Marked as ${next.replace(/_/g, " ")}`);
    } catch {
      toast.error("Could not update status");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-farumasi-600" />
      </div>
    );
  }

  if (notFound || !rx) {
    return (
      <div className="p-6 text-center py-24">
        <p className="text-slate-500">Request not found.</p>
        <button onClick={() => router.back()} className="text-farumasi-600 font-medium hover:underline mt-2 inline-block">
          Go Back
        </button>
      </div>
    );
  }

  const totalAmount = rx.items.reduce(
    (sum, i) => sum + (i.unit_price ?? 0) * (i.quantity ?? 1),
    0,
  );
  const isNew = rx.status === "draft" || rx.status === "active";
  const isUnderReview = rx.status === "under_review";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-farumasi-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Requests
      </button>

      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
            Request #{rx.id.slice(-8).toUpperCase()}
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">
            {rx.patient?.user?.full_name ?? "Unknown Patient"}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
            <Phone className="w-3.5 h-3.5" />
            {rx.patient?.user?.phone ?? "—"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Submitted {formatDateTime(rx.created_at)}</p>
        </div>
        <StatusBadge status={rx.status} type="request" />
      </div>

      {rx.uploaded_file_url && (
        <div className="mb-5 rounded-2xl overflow-hidden">
          <img src={rx.uploaded_file_url} alt="Prescription" className="w-full rounded-2xl" />
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-farumasi-600" />
          Prescription Items
        </h2>
        {rx.items.length === 0 ? (
          <p className="text-sm text-slate-500">No items listed.</p>
        ) : (
          <div className="space-y-2.5">
            {rx.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.medication_name}</p>
                  <p className="text-xs text-slate-500">
                    {item.dosage ? `${item.dosage} · ` : ""}
                    {item.frequency ? `${item.frequency} · ` : ""}
                    Qty {item.quantity ?? 1}
                    {item.duration_days ? ` · ${item.duration_days} days` : ""}
                  </p>
                </div>
                {item.unit_price != null && (
                  <p className="text-sm font-bold text-slate-900 shrink-0 ml-2">
                    {formatPrice(item.unit_price * (item.quantity ?? 1))} RWF
                  </p>
                )}
              </div>
            ))}
            {totalAmount > 0 && (
              <div className="pt-2 flex justify-between border-t border-slate-100">
                <p className="text-sm font-bold text-slate-900">Total</p>
                <p className="text-base font-extrabold text-farumasi-700">{formatPrice(totalAmount)} RWF</p>
              </div>
            )}
          </div>
        )}
      </div>

      {rx.notes && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-5">
          <p className="text-xs text-slate-500 mb-1">Patient notes</p>
          <p className="text-sm text-slate-900">{rx.notes}</p>
        </div>
      )}

      {isNew && (
        <div className="flex gap-3">
          <button
            onClick={() => setStatus("cancelled")}
            disabled={acting}
            className="flex-1 h-12 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" /> Reject
          </button>
          <button
            onClick={() => setStatus("under_review")}
            disabled={acting}
            className="flex-1 h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" /> Accept Request
          </button>
        </div>
      )}

      {isUnderReview && (
        <button
          onClick={() => setStatus("reviewed")}
          disabled={acting}
          className="w-full h-12 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 disabled:opacity-60 text-white font-bold transition-colors flex items-center justify-center gap-2"
        >
          {acting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Mark as Reviewed
        </button>
      )}
    </div>
  );
}
