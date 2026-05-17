"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Plus, AlertTriangle, Edit2, Trash2, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { mockListedProducts } from "@/data/mock";
import { formatRWF, formatCompactRWF } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function ListedProductsPage() {
  const totalListings = mockListedProducts.length;
  const activeCount = mockListedProducts.filter(p => p.status === "available").length;
  const lowCount = mockListedProducts.filter(p => p.status === "low_stock").length;
  const outCount = mockListedProducts.filter(p => p.status === "out_of_stock").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Listings"
        description="Products you've listed on the FARUMASI marketplace"
        icon={Package}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("Opening product listing form…")}>
            <Plus className="w-4 h-4" /> Add Listing
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Listings", value: totalListings, color: "text-foreground" },
          { label: "Available", value: activeCount, color: "text-green-600" },
          { label: "Low Stock", value: lowCount, color: "text-amber-600" },
          { label: "Out of Stock", value: outCount, color: "text-red-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Listings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price (RWF)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockListedProducts.map(listing => {
                const stockPct = listing.reorderThreshold > 0
                  ? Math.min(100, (listing.stockQty / (listing.reorderThreshold * 3)) * 100)
                  : 100;
                const isLow = listing.status === "low_stock" || listing.status === "out_of_stock";

                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {listing.product.imageUrl ? (
                            <Image src={listing.product.imageUrl} alt={listing.product.name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                        <p className="font-medium text-sm">{listing.product.name}</p>
                        {listing.product.brand && (
                          <p className="text-[11px] text-muted-foreground">{listing.product.brand}</p>
                        )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{listing.sku}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{formatRWF(listing.price)}</p>
                        {listing.comparePrice && (
                          <p className="text-[11px] text-muted-foreground line-through">{formatRWF(listing.comparePrice)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[100px]">
                        <div className="flex items-center gap-1">
                          {isLow && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className="text-xs font-medium">{listing.stockQty} units</span>
                        </div>
                        <Progress
                          value={stockPct}
                          className="h-1.5"
                          indicatorClassName={isLow ? (listing.status === "out_of_stock" ? "bg-red-500" : "bg-amber-500") : "bg-green-500"}
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={listing.status} type="product" /></TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-xs">{formatCompactRWF(listing.totalRevenue)}</p>
                        <p className="text-[11px] text-muted-foreground">{listing.totalSales} sold</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {listing.deliveryAvailable && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Delivery</span>}
                        {listing.pickupAvailable && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">Pickup</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => toast.info(`Viewing ${listing.product.name}`)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => toast.info(`Editing ${listing.product.name}`)}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { if (confirm(`Delete listing for ${listing.product.name}?`)) toast.success("Listing deleted"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
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
