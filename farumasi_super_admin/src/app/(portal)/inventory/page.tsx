"use client";

import { useEffect, useState } from "react";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Warehouse, AlertTriangle, TrendingDown, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendListing {
  id: string;
  product?: { name?: string; category?: string } | null;
  price: number;
  stock_quantity: number;
  availability_status: string;
}

interface StockSummary {
  productName: string;
  category: string;
  avgPrice: number;
  totalListings: number;
  outOfStock: number;
  minStock: number;
  status: "Critical" | "Low" | "Adequate" | "Out of Stock";
}

function buildSummary(listings: BackendListing[]): StockSummary[] {
  const map = new Map<string, BackendListing[]>();
  listings.forEach((l) => {
    const key = l.product?.name ?? l.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(l);
  });
  return Array.from(map.entries()).map(([name, items]) => {
    const minStock = Math.min(...items.map((i) => i.stock_quantity));
    const avgPrice = items.reduce((s, i) => s + i.price, 0) / items.length;
    const outOfStock = items.filter((i) => i.availability_status === "out_of_stock").length;
    let status: StockSummary["status"] = "Adequate";
    if (outOfStock === items.length) status = "Out of Stock";
    else if (minStock <= 5) status = "Critical";
    else if (minStock <= 15) status = "Low";
    return {
      productName: name,
      category: items[0].product?.category ?? "—",
      avgPrice,
      totalListings: items.length,
      outOfStock,
      minStock,
      status,
    };
  }).sort((a, b) => a.minStock - b.minStock);
}

export default function InventoryPage() {
  const [summaries, setSummaries] = useState<StockSummary[]>([]);
  const [pharmaciesCount, setPharmaciesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ items: BackendListing[]; total: number }>("/listings/", { params: { limit: 100, offset: 0 } }),
      api.get<{ items: unknown[]; total: number }>("/pharmacies/", { params: { limit: 1, offset: 0 } }),
    ])
      .then(([listRes, pharRes]) => {
        setSummaries(buildSummary(listRes.data.items));
        setPharmaciesCount(pharRes.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const critical = summaries.filter((s) => s.status === "Critical" || s.status === "Out of Stock").length;
  const low = summaries.filter((s) => s.status === "Low").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Inventory Intelligence" subtitle="Stock levels and reorder monitoring across all pharmacies" breadcrumb="Marketplace" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Critical Stock" value={critical} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Low Stock" value={low} icon={TrendingDown} color="text-amber-700" />
        <StatCard label="Total SKUs Tracked" value={summaries.length} icon={Warehouse} color="text-blue-700" />
        <StatCard label="Pharmacies" value={pharmaciesCount} icon={Warehouse} color="text-farumasi-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Stock by SKU</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading inventory…</span>
            </div>
          )}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Product</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Category</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Min Stock</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Listings</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Avg Price</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-[12px] font-semibold text-slate-900">{s.productName}</p>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-slate-600">{s.category}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-slate-700">{s.minStock}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{s.totalListings}</td>
                      <td className="px-4 py-3 text-[12px] text-slate-500">{formatRWF(s.avgPrice)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={s.status === "Adequate" ? "success" : s.status === "Out of Stock" || s.status === "Critical" ? "error" : "warning"}>
                          {s.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
