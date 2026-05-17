"use client";

import { mockAvailability, mockPharmacies } from "@/data/mock";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, ProgressBar, StatCard } from "@/components/ui";
import { Warehouse, AlertTriangle, TrendingDown } from "lucide-react";

export default function InventoryPage() {
  const criticalCount = mockAvailability.filter(a => a.stockStatus === "Critical").length;
  const lowCount = mockAvailability.filter(a => a.stockStatus === "Low").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Inventory Intelligence" subtitle="Stock levels and reorder monitoring across all pharmacies" breadcrumb="Marketplace" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Critical Stock" value={criticalCount} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Low Stock" value={lowCount} icon={TrendingDown} color="text-amber-700" />
        <StatCard label="Total SKUs Tracked" value={mockAvailability.length} icon={Warehouse} color="text-blue-700" />
        <StatCard label="Pharmacies" value={mockPharmacies.length} icon={Warehouse} color="text-farumasi-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Stock Intelligence by SKU</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Product</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Category</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Coverage</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Pharmacies</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Avg Price</th>
                  <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockAvailability.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 border-b border-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-semibold text-slate-900">{a.productName}</p>
                      <p className="text-[10px] text-slate-400">{a.category}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">{a.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-32">
                        <ProgressBar value={a.coveragePercent} color={a.stockStatus === "Critical" ? "bg-red-500" : a.stockStatus === "Low" ? "bg-amber-500" : "bg-emerald-500"} />
                        <span className="text-[10px] font-semibold text-slate-700">{a.coveragePercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-slate-700">{a.availablePharmacies} / {a.totalListings}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">RWF {a.avgPrice.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.stockStatus === "Adequate" ? "success" : a.stockStatus === "Out of Stock" ? "error" : "warning"}>{a.stockStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
