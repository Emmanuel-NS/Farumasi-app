"use client";
import {
  MapPin, Star, Clock, Phone, CheckCircle2, AlertTriangle,
  TrendingUp, Package, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { getScoreBgColor, getStockBg } from "@/lib/utils";
import type { Pharmacy } from "@/types";

const PHARMACIES: Pharmacy[] = [];

const TIER_COLORS: Record<string, string> = {
  Tier1: "bg-farumasi-100 text-farumasi-700 border-farumasi-200",
  Tier2: "bg-blue-100 text-blue-700 border-blue-200",
  Tier3: "bg-slate-100 text-slate-600 border-slate-200",
};

const TIER_LABELS: Record<string, string> = {
  Tier1: "Tier 1 — Primary",
  Tier2: "Tier 2 — Secondary",
  Tier3: "Tier 3 — Basic",
};

export default function PharmacyPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Pharmacy Network"
        subtitle={`${PHARMACIES.length} pharmacies in your network`}
        icon={<Package className="w-5 h-5" />}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Pharmacies", value: PHARMACIES.length, icon: Package, color: "text-farumasi-600" },
          { label: "Open 24h", value: PHARMACIES.filter(p => p.isOpen24h).length, icon: Clock, color: "text-blue-600" },
          { label: "Avg Fulfillment", value: PHARMACIES.length ? `${Math.round(PHARMACIES.reduce((a, p) => a + p.fulfillmentRate, 0) / PHARMACIES.length)}%` : "N/A", icon: CheckCircle2, color: "text-green-600" },
          { label: "Avg Distance", value: PHARMACIES.length ? `${(PHARMACIES.reduce((a, p) => a + p.distanceKm, 0) / PHARMACIES.length).toFixed(1)}km` : "N/A", icon: MapPin, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pharmacy cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PHARMACIES.map((pharmacy) => (
          <div key={pharmacy.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 leading-snug">{pharmacy.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-400 truncate">{pharmacy.address}</p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${TIER_COLORS[pharmacy.tier]}`}>
                {pharmacy.tier}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2.5 rounded-lg bg-slate-50">
                <p className="text-[10px] text-slate-400 mb-1">Fulfillment</p>
                <p className="text-lg font-bold text-farumasi-700">{pharmacy.fulfillmentRate}%</p>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-slate-50">
                <p className="text-[10px] text-slate-400 mb-1">Distance</p>
                <p className="text-lg font-bold text-slate-700">{pharmacy.distanceKm}km</p>
              </div>
            </div>

            {/* Reliability score */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Reliability Score</span>
                <span className="font-semibold text-slate-800">{pharmacy.reliabilityScore}/100</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pharmacy.reliabilityScore >= 80 ? "bg-green-500" : pharmacy.reliabilityScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${pharmacy.reliabilityScore}%` }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {pharmacy.isOpen24h && (
                <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Open 24h</span>
              )}
              {pharmacy.acceptedInsurance.slice(0, 3).map((ins) => (
                <span key={ins} className="text-[10px] bg-farumasi-50 text-farumasi-700 px-1.5 py-0.5 rounded-full font-medium">{ins}</span>
              ))}
            </div>

            {/* Contact */}
            {pharmacy.phone && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-600">{pharmacy.phone}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
