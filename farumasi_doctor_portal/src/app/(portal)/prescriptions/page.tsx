"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Search, FilePlus,
  CheckCircle2, Clock, Send, AlertTriangle,
  XCircle, ChevronRight, RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { prescriptionsService } from "@/lib/services/prescriptions.service";
import {
  getPrescriptionStatusColor, formatDate, timeAgo, getInitials,
} from "@/lib/utils";
import type { Prescription, PrescriptionStatus } from "@/types";
import { toast } from "sonner";

const STATUS_FILTERS: { label: string; value: PrescriptionStatus | "All"; icon: React.ElementType; color: string }[] = [
  { label: "All", value: "All", icon: FileText, color: "text-slate-600" },
  { label: "Pending", value: "Pending", icon: Clock, color: "text-amber-600" },
  { label: "Sent", value: "Sent", icon: Send, color: "text-blue-600" },
  { label: "Partial", value: "PartiallyFulfilled", icon: AlertTriangle, color: "text-orange-600" },
  { label: "Fulfilled", value: "Fulfilled", icon: CheckCircle2, color: "text-green-600" },
  { label: "Expired", value: "Expired", icon: XCircle, color: "text-red-600" },
];

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PrescriptionStatus | "All">("All");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await prescriptionsService.getMyPrescriptions();
      setPrescriptions(data);
    } catch {
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prescriptions.filter((rx) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      rx.patientName.toLowerCase().includes(q) ||
      rx.prescriptionNumber.toLowerCase().includes(q) ||
      rx.diagnosis.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Prescriptions"
        subtitle={loading ? "Loading…" : `${prescriptions.length} prescriptions total`}
        icon={<FileText className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/prescriptions/new"
              className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              New Prescription
            </Link>
          </div>
        }
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_FILTERS.map((f) => {
          const Icon = f.icon;
          const count = f.value === "All" ? prescriptions.length : prescriptions.filter((r) => r.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === f.value
                  ? "bg-farumasi-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${statusFilter === f.value ? "text-white" : f.color}`} />
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${statusFilter === f.value ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by patient, prescription #, diagnosis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        />
      </div>

      {/* Prescriptions list */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No prescriptions match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((rx) => (
              <Link
                key={rx.id}
                href={`/prescriptions/${rx.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-farumasi-700">{getInitials(rx.patientName)}</span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{rx.patientName}</p>
                    <span className="text-xs text-slate-400">{rx.prescriptionNumber}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{rx.diagnosis}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400">
                      {rx.items.length} item{rx.items.length !== 1 ? "s" : ""}
                    </span>
                    {rx.pharmacyName && (
                      <span className="text-xs text-slate-400 truncate">
                        📍 {rx.pharmacyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + date */}
                <div className="text-right flex-shrink-0 space-y-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPrescriptionStatusColor(rx.status)}`}>
                    {rx.status}
                  </span>
                  <p className="text-[10px] text-slate-400">{timeAgo(rx.createdAt)}</p>
                  <p className="text-[10px] text-slate-300">Expires {formatDate(rx.validUntil)}</p>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
