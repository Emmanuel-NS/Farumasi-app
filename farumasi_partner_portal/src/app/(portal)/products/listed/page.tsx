"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Package, Plus, AlertTriangle, Edit2, Trash2, Loader2, X,
  Clock, Hash, CheckCircle2, XCircle, Building2, Globe, ShieldCheck, FlaskConical,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatRWF, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import {
  listingsService,
  type BackendListing,
  type UpdateListingInput,
} from "@/lib/services/listings.service";
import Link from "next/link";

const LOW_THRESHOLD = 10;

type StockStatus = "available" | "low_stock" | "out_of_stock" | "unavailable";

function stockStatus(l: BackendListing): StockStatus {
  if (l.availability_status === "out_of_stock" || l.stock_quantity <= 0) return "out_of_stock";
  if (l.availability_status === "unavailable") return "unavailable";
  if (l.stock_quantity <= LOW_THRESHOLD) return "low_stock";
  return "available";
}

const STATUS_META: Record<StockStatus, { label: string; dot: string; badge: string }> = {
  available:   { label: "Available",    dot: "bg-green-500",  badge: "bg-green-50 text-green-700 border-green-200" },
  low_stock:   { label: "Low Stock",    dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  out_of_stock:{ label: "Out of Stock", dot: "bg-red-500",    badge: "bg-red-50 text-red-700 border-red-200" },
  unavailable: { label: "Unavailable",  dot: "bg-slate-400",  badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

interface EditState {
  id: string;
  productName: string;
  price: string;
  stock: string;
  batch: string;
  fulfillment: string;
  availability: string;
  unitPrice: string;
  allowsPartial: boolean;
  partialUnitName: string;
}

export default function ListedProductsPage() {
  const [listings, setListings] = useState<BackendListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

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
    let active = 0, low = 0, out = 0;
    listings.forEach(l => {
      const s = stockStatus(l);
      if (s === "available") active++;
      else if (s === "low_stock") low++;
      else if (s === "out_of_stock") out++;
    });
    return { total: listings.length, active, low, out };
  }, [listings]);

  const openEdit = (l: BackendListing) => {
    setEditState({
      id: l.id,
      productName: l.product?.name ?? "Listing",
      price: String(l.price),
      stock: String(l.stock_quantity),
      batch: l.batch_number ?? "",
      fulfillment: String(l.fulfillment_time_minutes),
      availability: l.availability_status,
      unitPrice: l.unit_price != null ? String(l.unit_price) : "",
      allowsPartial: l.product?.allows_partial_selling ?? false,
      partialUnitName: l.product?.partial_unit_name ?? "unit",
    });
  };

  const handleSave = async () => {
    if (!editState) return;
    const price = parseFloat(editState.price);
    const stock = parseInt(editState.stock, 10);
    const fulfillment = parseInt(editState.fulfillment, 10);
    if (Number.isNaN(price) || price < 0) { toast.error("Enter a valid price"); return; }
    if (Number.isNaN(stock) || stock < 0) { toast.error("Enter a valid stock quantity"); return; }
    if (Number.isNaN(fulfillment) || fulfillment < 0) { toast.error("Enter valid fulfillment time"); return; }

    const update: UpdateListingInput = {
      price,
      stock_quantity: stock,
      batch_number: editState.batch || null,
      fulfillment_time_minutes: fulfillment,
      availability_status: editState.availability as UpdateListingInput["availability_status"],
      unit_price: editState.allowsPartial && editState.unitPrice ? parseFloat(editState.unitPrice) : null,
    };

    setSaving(true);
    try {
      const updated = await listingsService.updateListing(editState.id, update);
      setListings(prev => prev.map(l => (l.id === updated.id ? { ...l, ...updated } : l)));
      toast.success("Listing updated");
      setEditState(null);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to update listing"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (l: BackendListing) => {
    const name = l.product?.name || "this listing";
    if (!confirm(`Delete listing for ${name}?`)) return;
    setDeleting(l.id);
    try {
      await listingsService.deleteListing(l.id);
      toast.success("Listing deleted");
      setListings(prev => prev.filter(x => x.id !== l.id));
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to delete"));
    } finally {
      setDeleting(null);
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Listed", value: counts.total, icon: Package, color: "text-farumasi-600", bg: "bg-farumasi-50" },
          { label: "Available", value: counts.active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Low Stock", value: counts.low, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Out of Stock", value: counts.out, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="py-4 px-4 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                  <Icon className={cn("w-4.5 h-4.5", stat.color)} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground leading-none">{stat.label}</p>
                  <p className={cn("text-2xl font-bold mt-0.5", stat.color)}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Product cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 rounded bg-slate-200" />
                  <div className="h-3 w-20 rounded bg-slate-200" />
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-8 rounded-lg bg-slate-200" />
                <div className="h-8 rounded-lg bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No listings yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse the catalogue and add your first product.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/products/catalogue"><Plus className="w-4 h-4 mr-1.5" /> Add from Catalogue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map(listing => {
            const p = listing.product;
            const s = stockStatus(listing);
            const meta = STATUS_META[s];
            const stockPct = Math.min(100, (listing.stock_quantity / Math.max(listing.stock_quantity, LOW_THRESHOLD * 4)) * 100);
            return (
              <div
                key={listing.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-farumasi-300 hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group"
              >
                {/* ── Product identity header ── */}
                <div className="p-4 flex items-start gap-3">
                  {/* Image / icon */}
                  <div className="w-14 h-14 rounded-xl bg-farumasi-50 overflow-hidden flex items-center justify-center shrink-0 border border-farumasi-100">
                    {p?.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={p.name ?? ""}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <FlaskConical className="w-6 h-6 text-farumasi-400" />
                    )}
                  </div>

                  {/* Name block */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                      {p?.name ?? "—"}
                    </p>
                    {p?.generic_name && (
                      <p className="text-[11px] text-farumasi-600 font-medium mt-0.5 truncate">
                        {p.generic_name}
                      </p>
                    )}
                    {p?.brand && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        by {p.brand}
                      </p>
                    )}
                  </div>

                  {/* Prescription badge — top right */}
                  {p?.prescription_required && (
                    <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Rx
                    </span>
                  )}
                </div>

                {/* ── Description ── */}
                {p?.description && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                  </div>
                )}

                {/* ── Dosage + Strength pills ── */}
                {(p?.dosage_form || p?.strength) && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {p?.dosage_form && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                        {p.dosage_form}
                      </span>
                    )}
                    {p?.strength && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-100">
                        {p.strength}
                      </span>
                    )}
                    {p?.category && (
                      <span className="px-2 py-0.5 rounded-full bg-farumasi-50 text-[10px] font-medium text-farumasi-700">
                        {p.category}
                      </span>
                    )}
                  </div>
                )}

                {/* ── Manufacturer / Origin ── */}
                {(p?.manufacturer || p?.country_of_origin) && (
                  <div className="px-4 pb-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                    {p?.manufacturer && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.manufacturer}</span>
                      </span>
                    )}
                    {p?.country_of_origin && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Globe className="w-3 h-3" />
                        {p.country_of_origin}
                      </span>
                    )}
                  </div>
                )}

                <div className="h-px bg-slate-100 mx-4" />

                {/* ── Price + status ── */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground leading-none uppercase tracking-wide">Price</p>
                    <p className="text-base font-bold text-farumasi-600 mt-0.5">{formatRWF(listing.price)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] font-semibold gap-1 border", meta.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </Badge>
                </div>

                {/* ── Stock bar ── */}
                <div className="px-4 pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Stock</span>
                    <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                      {s === "low_stock" && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      {listing.stock_quantity} units
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", {
                        "bg-green-500": s === "available",
                        "bg-amber-500": s === "low_stock",
                        "bg-red-500": s === "out_of_stock",
                        "bg-slate-300": s === "unavailable",
                      })}
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                </div>

                {/* ── Meta row ── */}
                <div className="px-4 pb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {listing.fulfillment_time_minutes} min
                  </span>
                  {listing.batch_number && (
                    <span className="flex items-center gap-1 truncate">
                      <Hash className="w-3 h-3 shrink-0" />
                      <span className="font-mono truncate">{listing.batch_number}</span>
                    </span>
                  )}
                </div>

                {/* ── Actions — visible on hover ── */}
                <div className="mt-auto border-t border-slate-100 px-3 py-2 flex items-center gap-2 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1"
                    onClick={() => openEdit(listing)}
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    disabled={deleting === listing.id}
                    onClick={() => handleDelete(listing)}
                  >
                    {deleting === listing.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit listing dialog */}
      <Dialog open={!!editState} onOpenChange={open => !open && setEditState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-sm">Edit Listing</DialogTitle>
                {editState && (
                  <p className="text-xs text-muted-foreground mt-0.5">{editState.productName}</p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditState(null)} className="-mt-1 -mr-1">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          {editState && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Price (RWF) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number" min="0" step="1" className="h-8 text-xs"
                    value={editState.price}
                    onChange={e => setEditState(s => s ? { ...s, price: e.target.value } : s)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stock Quantity <span className="text-red-500">*</span></Label>
                  <Input
                    type="number" min="0" step="1" className="h-8 text-xs"
                    value={editState.stock}
                    onChange={e => setEditState(s => s ? { ...s, stock: e.target.value } : s)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Availability</Label>
                <Select value={editState.availability} onValueChange={v => setEditState(s => s ? { ...s, availability: v } : s)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available" className="text-xs">Available</SelectItem>
                    <SelectItem value="unavailable" className="text-xs">Unavailable</SelectItem>
                    <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Batch Number</Label>
                  <Input
                    className="h-8 text-xs font-mono" placeholder="Optional"
                    value={editState.batch}
                    onChange={e => setEditState(s => s ? { ...s, batch: e.target.value } : s)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fulfillment (min)</Label>
                  <Input
                    type="number" min="0" step="5" className="h-8 text-xs"
                    value={editState.fulfillment}
                    onChange={e => setEditState(s => s ? { ...s, fulfillment: e.target.value } : s)}
                  />
                </div>
              </div>
              {editState.allowsPartial && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Unit Price (RWF / {editState.partialUnitName})
                    <span className="ml-1 text-slate-400 font-normal">— partial selling</span>
                  </Label>
                  <Input
                    type="number" min="0" step="1" className="h-8 text-xs"
                    placeholder="Price per single unit"
                    value={editState.unitPrice}
                    onChange={e => setEditState(s => s ? { ...s, unitPrice: e.target.value } : s)}
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditState(null)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

