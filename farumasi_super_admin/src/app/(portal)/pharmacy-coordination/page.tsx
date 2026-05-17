"use client";

import { mockPharmacies } from "@/data/mock";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, ProgressBar, StatCard } from "@/components/ui";
import { Pill, ShoppingBag, Star } from "lucide-react";

export default function PharmacyCoordinationPage() {
  const criticalStock = mockPharmacies.filter(p => p.stockLevel === "Critical").length;
  const goodStock = mockPharmacies.filter(p => p.stockLevel === "Good").length;
  const highPerformers = mockPharmacies.filter(p => p.fulfillmentRate >= 80).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Pharmacy Coordination" subtitle="Pharmacy performance and stock coordination" breadcrumb="Operations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Good Stock" value={goodStock} icon={ShoppingBag} color="text-farumasi-700" />
        <StatCard label="Critical Stock" value={criticalStock} icon={Pill} color="text-red-700" />
        <StatCard label="High Performers" value={highPerformers} icon={Star} color="text-emerald-700" />
        <StatCard label="Approved Pharmacies" value={mockPharmacies.filter(p => p.status === "Approved").length} icon={ShoppingBag} color="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockPharmacies.map((p) => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
                <p className="text-[10px] text-slate-400">{p.district}</p>
              </div>
              <Badge variant={p.status === "Approved" ? "success" : p.status === "Rejected" ? "error" : "warning"}>{p.status}</Badge>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-slate-500 font-semibold">Stock Level</p>
                  <p className="text-[10px] font-bold text-slate-700">{p.stockLevel}</p>
                </div>
                <ProgressBar value={p.stockLevel === "Good" ? 90 : p.stockLevel === "Low" ? 40 : 10} color={p.stockLevel === "Good" ? "bg-emerald-500" : p.stockLevel === "Low" ? "bg-amber-500" : "bg-red-500"} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Fulfillment Rate</span>
                <span className="font-semibold text-slate-700">{p.fulfillmentRate}%</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Total Fulfillments</span>
                <span className="font-semibold text-amber-600">{p.totalFulfillments}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">License</span>
                <Badge variant={p.verifiedAt ? "success" : "warning"}>{p.verifiedAt ? "Verified" : "Pending"}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
