"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, AlertTriangle, Plus, Upload, RefreshCw, TrendingDown, Loader2, X, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { listingsService, type BackendListing, type ListingAvailability } from "@/lib/services/listings.service";
import type { ProductStatus } from "@/types";

/* ─── Edit / restock modal ──────────────────────────────────── */
interface EditModalProps {
  listing: BackendListing;
  onClose: () => void;
  onSaved: (updated: BackendListing) => void;
}
function EditListingModal({ listing, onClose, onSaved }: EditModalProps) {
  const [status, setStatus]     = useState<ListingAvailability>(listing.availability_status as ListingAvailability ?? "available");
  const [price, setPrice]       = useState(String(listing.price ?? ""));
  const [qty, setQty]           = useState(String(listing.stock_quantity ?? ""));
  const [expiry, setExpiry]     = useState(listing.expiry_date ? listing.expiry_date.slice(0, 10) : "");
  const [saving, setSaving]     = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await listingsService.updateListing(listing.id, {
        availability_status: status,
        price: price ? Number(price) : undefined,
        stock_quantity: qty ? Number(qty) : undefined,
        expiry_date: expiry || null,
      });
      onSaved(updated);
      toast.success("Listing updated");
      onClose();
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to update listing"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Edit Listing</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]">{listing.product?.name ?? "Product"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Availability Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ListingAvailability)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300 bg-white">
              <option value="available">Available</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Price (RWF)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Stock Quantity</label>
            <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="Units in stock"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Expiry Date</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-300" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

const LOW_THRESHOLD = 10;
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

function uiStatus(l: BackendListing): ProductStatus {
  if (l.availability_status === "out_of_stock" || l.stock_quantity <= 0) return "out_of_stock";
  if (l.availability_status === "unavailable") return "unavailable";
  if (l.stock_quantity <= LOW_THRESHOLD) return "low_stock";
  return "available";
}

export default function InventoryPage() {
  const router = useRouter();
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [editListing, setEditListing] = useState<BackendListing | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listingsService.listMyListings({ offset: 0, limit: 100 });
      setListings(res.items);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load inventory"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    let units = 0, low = 0, out = 0, expiring = 0;
    const now = Date.now();
    listings.forEach(l => {
      units += l.stock_quantity;
      const s = uiStatus(l);
      if (s === "low_stock") low++;
      if (s === "out_of_stock") out++;
      if (l.expiry_date && new Date(l.expiry_date).getTime() < now + NINETY_DAYS) expiring++;
    });
    return { units, low, out, expiring };
  }, [listings]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track stock levels, batch numbers, and expiry dates"
        icon={Boxes}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => toast.info("CSV import coming soon")}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => router.push("/products/catalogue")}>
              <Plus className="w-3.5 h-3.5" /> Add Stock
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Units" value={kpis.units.toLocaleString()} icon={Boxes} />
        <KpiCard title="Low Stock SKUs" value={String(kpis.low)} icon={AlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <KpiCard title="Out of Stock" value={String(kpis.out)} icon={TrendingDown} iconBg="bg-red-100" iconColor="text-red-600" />
        <KpiCard title="Expiring Soon" value={String(kpis.expiring)} icon={RefreshCw} iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                  </TableCell>
                </TableRow>
              )}
              {!loading && listings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No inventory yet. Add listings from the catalogue.
                  </TableCell>
                </TableRow>
              )}
              {!loading && listings.map(listing => {
                const s = uiStatus(listing);
                const pct = Math.min(100, Math.round((listing.stock_quantity / (LOW_THRESHOLD * 4)) * 100));
                const expDate = listing.expiry_date ? new Date(listing.expiry_date) : null;
                const isExpired = expDate ? expDate.getTime() < Date.now() : false;
                const isExpiring = expDate ? expDate.getTime() < Date.now() + NINETY_DAYS : false;
                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{listing.product?.name || "Product"}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{(listing.product?.category ?? "").replace("_", " ")}</p>
                    </TableCell>
                    <TableCell className="text-xs">{listing.batch_number ?? "—"}</TableCell>
                    <TableCell>
                      {expDate ? (
                        <span className={`text-xs font-medium ${isExpired ? "text-red-600" : isExpiring ? "text-amber-600" : "text-foreground"}`}>
                          {formatDate(expDate.toISOString(), true)}
                          {isExpiring && !isExpired && <span className="ml-1 text-[10px]">⚠</span>}
                          {isExpired && <span className="ml-1 text-[10px]">✕</span>}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold">{listing.stock_quantity}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">units</span>
                    </TableCell>
                    <TableCell>
                      <div className="w-20">
                        <Progress
                          value={pct}
                          className="h-2"
                          indicatorClassName={
                            s === "out_of_stock" ? "bg-red-500" :
                            s === "low_stock" ? "bg-amber-500" : "bg-green-500"
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s} type="product" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => setEditListing(listing)}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editListing && (
        <EditListingModal
          listing={editListing}
          onClose={() => setEditListing(null)}
          onSaved={(updated) => setListings(prev => prev.map(x => x.id === updated.id ? updated : x))}
        />
      )}
    </div>
  );
}
