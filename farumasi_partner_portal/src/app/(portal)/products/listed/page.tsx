"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Package, Plus, AlertTriangle, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { formatRWF } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { listingsService, type BackendListing } from "@/lib/services/listings.service";
import type { ProductStatus } from "@/types";
import Link from "next/link";

const LOW_THRESHOLD = 10;

function uiStatus(l: BackendListing): ProductStatus {
  if (l.availability_status === "out_of_stock" || l.stock_quantity <= 0) return "out_of_stock";
  if (l.availability_status === "unavailable") return "unavailable";
  if (l.stock_quantity <= LOW_THRESHOLD) return "low_stock";
  return "available";
}

export default function ListedProductsPage() {
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listingsService.listMyListings({ offset: 0, limit: 100 });
      setListings(res.items);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load listings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const t = listings.length;
    let active = 0, low = 0, out = 0;
    listings.forEach(l => {
      const s = uiStatus(l);
      if (s === "available") active++;
      else if (s === "low_stock") low++;
      else if (s === "out_of_stock") out++;
    });
    return { total: t, active, low, out };
  }, [listings]);

  const handleDelete = async (l: BackendListing) => {
    const name = l.product?.name || "this listing";
    if (!confirm(`Delete listing for ${name}?`)) return;
    setBusy(l.id);
    try {
      await listingsService.deleteListing(l.id);
      toast.success("Listing deleted");
      setListings(prev => prev.filter(x => x.id !== l.id));
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to delete"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Listings"
        description="Products you've listed on the FARUMASI marketplace"
        icon={Package}
        actions={
          <Button size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/products/catalogue"><Plus className="w-4 h-4" /> Add Listing</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Listings", value: counts.total, color: "text-foreground" },
          { label: "Available", value: counts.active, color: "text-green-600" },
          { label: "Low Stock", value: counts.low, color: "text-amber-600" },
          { label: "Out of Stock", value: counts.out, color: "text-red-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-4 px-5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Price (RWF)</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading listings…
                  </TableCell>
                </TableRow>
              )}
              {!loading && listings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No listings yet. Add one from the catalogue.
                  </TableCell>
                </TableRow>
              )}
              {!loading && listings.map(listing => {
                const s = uiStatus(listing);
                const isLow = s === "low_stock" || s === "out_of_stock";
                const pct = Math.min(100, (listing.stock_quantity / (LOW_THRESHOLD * 4)) * 100);
                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {listing.product?.image_url ? (
                            <Image src={listing.product.image_url} alt={listing.product.name} width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{listing.product?.name || "Product"}</p>
                          {listing.product?.brand && (
                            <p className="text-[11px] text-muted-foreground">{listing.product.brand}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{listing.batch_number ?? "—"}</TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{formatRWF(listing.price)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[100px]">
                        <div className="flex items-center gap-1">
                          {isLow && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className="text-xs font-medium">{listing.stock_quantity} units</span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-1.5"
                          indicatorClassName={isLow ? (s === "out_of_stock" ? "bg-red-500" : "bg-amber-500") : "bg-green-500"}
                        />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={s} type="product" /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{listing.fulfillment_time_minutes} min</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon-sm" onClick={() => toast.info(listing.product?.name || "Listing")}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => toast.info("Edit form coming soon")}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={busy === listing.id}
                          onClick={() => handleDelete(listing)}
                        >
                          {busy === listing.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
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
