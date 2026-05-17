"use client";

import { Boxes, AlertTriangle, Plus, Upload, RefreshCw, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockListedProducts } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function InventoryPage() {
  const totalUnits = mockListedProducts.reduce((s, p) => s + p.stockQty, 0);
  const lowStockItems = mockListedProducts.filter(p => p.status === "low_stock").length;
  const outOfStockItems = mockListedProducts.filter(p => p.status === "out_of_stock").length;
  const expiringItems = mockListedProducts.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track stock levels, batch numbers, and expiry dates"
        icon={Boxes}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.info("Opening CSV import…")}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => toast.info("Opening stock entry form…")}>
              <Plus className="w-3.5 h-3.5" /> Add Stock
            </Button>
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Units" value={totalUnits.toLocaleString()} icon={Boxes} />
        <KpiCard title="Low Stock SKUs" value={String(lowStockItems)} icon={AlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="Out of Stock" value={String(outOfStockItems)} icon={TrendingDown} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard title="Expiring Soon" value={String(expiringItems)} icon={RefreshCw} iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      {/* Inventory table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Reorder At</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockListedProducts.map(listing => {
                const stockPct = listing.reorderThreshold > 0
                  ? Math.min(100, Math.round((listing.stockQty / (listing.reorderThreshold * 4)) * 100))
                  : 100;
                const isExpiringSoon = listing.expiryDate && new Date(listing.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                const isExpired = listing.expiryDate && new Date(listing.expiryDate) < new Date();

                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{listing.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{listing.product.category.replace("_", " ")}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{listing.sku}</TableCell>
                    <TableCell className="text-xs">{listing.batchNumber ?? "—"}</TableCell>
                    <TableCell>
                      {listing.expiryDate ? (
                        <span className={`text-xs font-medium ${isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-foreground"}`}>
                          {formatDate(listing.expiryDate, true)}
                          {isExpiringSoon && !isExpired && <span className="ml-1 text-[10px]">⚠</span>}
                          {isExpired && <span className="ml-1 text-[10px]">✕</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold">{listing.stockQty}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">units</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{listing.reorderThreshold}</TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress
                          value={stockPct}
                          className="h-2"
                          indicatorClassName={
                            listing.status === "out_of_stock" ? "bg-red-500" :
                            listing.status === "low_stock" ? "bg-amber-500" : "bg-green-500"
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={listing.status} type="product" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => toast.success(`Restock request sent for ${listing.product.name}`)}>+ Restock</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
