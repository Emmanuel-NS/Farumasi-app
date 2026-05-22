"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Package, Search, CheckCircle2, Clock, AlertTriangle,
  XCircle, MapPin, Pill, ChevronRight, User,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  getFulfillmentStatusColor, formatDate, formatDateTime, timeAgo, formatRWF,
} from "@/lib/utils";
import type { FulfillmentTracking } from "@/types";

export default function FulfillmentPage() {
  const [search, setSearch] = useState("");
  const fulfillments: FulfillmentTracking[] = [];

  const filtered = fulfillments.filter((f) => {
    const q = search.toLowerCase();
    return (
      !q ||
      f.prescriptionNumber.toLowerCase().includes(q) ||
      f.patientName.toLowerCase().includes(q) ||
      f.pharmacyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fulfillment Tracking"
        subtitle="Track prescription dispensing across pharmacies"
        icon={<Package className="w-5 h-5" />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Fulfilled", count: fulfillments.filter(f => f.status === "Fulfilled").length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending", count: fulfillments.filter(f => f.status === "Pending").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Partial", count: fulfillments.filter(f => f.status === "PartiallyFulfilled").length, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Failed", count: fulfillments.filter(f => f.status === "Failed").length, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-800">{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by patient, prescription #, pharmacy..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-farumasi-500"
        />
      </div>

      {/* Fulfillments */}
      <div className="space-y-4">
        {filtered.map((fulfillment) => (
          <div key={fulfillment.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-50 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{fulfillment.patientName}</p>
                  <Link href={`/prescriptions/${fulfillment.prescriptionId}`} className="text-xs text-farumasi-600 hover:underline">
                    {fulfillment.prescriptionNumber}
                  </Link>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    {fulfillment.pharmacyName}
                  </span>
                  <span className="text-xs text-slate-400">{timeAgo(fulfillment.createdAt)}</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${getFulfillmentStatusColor(fulfillment.status)}`}>
                {fulfillment.status}
              </span>
            </div>

            {/* Items summary */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Pill className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    {fulfillment.itemsFulfilled} / {fulfillment.itemsTotal} items fulfilled
                  </span>
                </div>
                {fulfillment.substitutions.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                    {fulfillment.substitutions.length} substitution{fulfillment.substitutions.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {fulfillment.substitutions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {fulfillment.substitutions.map((s, i) => (
                    <p key={i} className="text-xs text-slate-500 italic">
                      {s.original} → {s.substituted}: {s.reason}
                    </p>
                  ))}
                </div>
              )}
              {fulfillment.failureReason && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {fulfillment.failureReason}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {fulfillment.dispatchedAt && (
                  <span className="text-xs text-slate-500">Dispatched: {timeAgo(fulfillment.dispatchedAt)}</span>
                )}
                {fulfillment.fulfilledAt && (
                  <span className="text-xs text-slate-500">Fulfilled: {timeAgo(fulfillment.fulfilledAt)}</span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {fulfillment.patientNotified ? "Patient notified" : "Patient not notified"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
