"use client";

import { useState } from "react";
import { Search, Building2, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, EmptyState } from "@/components/ui";
import { mockPharmacies } from "@/data/mock";
import { getRateColor } from "@/lib/utils";

export default function PharmacyPage() {
  const [search, setSearch] = useState("");

  const filtered = mockPharmacies.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Pharmacy Coordination" subtitle={`${mockPharmacies.filter((p) => p.status === "Active").length} active pharmacy partners in network`} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Active Partners", value: mockPharmacies.filter((p) => p.status === "Active").length },
          { label: "Avg Fulfillment Rate", value: `${Math.round(mockPharmacies.reduce((s, p) => s + p.fulfillmentRate, 0) / mockPharmacies.length)}%` },
          { label: "Total Fulfillments", value: mockPharmacies.reduce((s, p) => s + p.totalFulfillments, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <Input icon={Search} placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No pharmacies found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />{p.location}, {p.district}
                  </div>
                </div>
                <Badge variant={p.status === "Active" ? "success" : p.status === "Suspended" ? "error" : "warning"}>{p.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Fulfillment Rate</p>
                  <p className={`font-bold ${getRateColor(p.fulfillmentRate)}`}>{p.fulfillmentRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Total Fulfillments</p>
                  <p className="font-bold text-slate-900">{p.totalFulfillments}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Avg Processing</p>
                  <p className="font-semibold text-slate-800">{p.avgProcessingTime}m</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Stock Level</p>
                  <span className={`text-xs font-semibold ${p.stockLevel === "Good" ? "text-emerald-600" : p.stockLevel === "Low" ? "text-amber-600" : "text-red-600"}`}>{p.stockLevel}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Fulfillment</span><span>{p.fulfillmentRate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.fulfillmentRate >= 95 ? "bg-emerald-500" : p.fulfillmentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${p.fulfillmentRate}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <Phone className="w-3 h-3" />{p.phone}
                <span className="ml-auto text-[10px] text-slate-400">Active: {p.lastActivity ? new Date(p.lastActivity).toLocaleDateString("en-RW", { month: "short", day: "numeric" }) : "—"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
