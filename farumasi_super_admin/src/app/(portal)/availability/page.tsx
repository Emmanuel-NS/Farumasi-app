"use client";

import { mockAvailability } from "@/data/mock";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, ProgressBar, StatCard } from "@/components/ui";
import { Globe2, CheckCircle2 } from "lucide-react";

export default function AvailabilityPage() {
  const lowCoverage = mockAvailability.filter(a => a.coveragePercent < 50).length;
  const outOfStock = mockAvailability.filter(a => a.stockStatus === "Out of Stock").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Availability Intelligence" subtitle="Medicine availability coverage across the pharmacy network" breadcrumb="Marketplace" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg Coverage" value={`${Math.round(mockAvailability.reduce((a, r) => a + r.coveragePercent, 0) / mockAvailability.length)}%`} icon={Globe2} color="text-farumasi-700" />
        <StatCard label="Low Coverage" value={lowCoverage} icon={CheckCircle2} color="text-amber-700" />
        <StatCard label="Out of Stock" value={outOfStock} icon={CheckCircle2} color="text-red-700" />
        <StatCard label="Total Tracked" value={mockAvailability.length} icon={Globe2} color="text-blue-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Availability Map</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {mockAvailability.map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{a.productName}</p>
                    <p className="text-[10px] text-slate-400">{a.category}</p>
                  </div>
                  <Badge variant={a.stockStatus === "Adequate" ? "success" : a.stockStatus === "Out of Stock" ? "error" : "warning"}>{a.stockStatus}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <ProgressBar value={a.coveragePercent} color={a.coveragePercent < 30 ? "bg-red-500" : a.coveragePercent < 60 ? "bg-amber-500" : "bg-emerald-500"} />
                  <span className="text-[10px] font-semibold text-slate-600 shrink-0">{a.coveragePercent}%</span>
                </div>
                <p className="text-[10px] text-slate-400">{a.availablePharmacies} pharmacies · Avg: {formatRWF(a.avgPrice)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
