"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Search, Pill, FlaskConical, Heart, Package2, Loader2, CheckCircle2,
  ShieldCheck, Building2, Globe, Layers, SlidersHorizontal,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { listingsService, type BackendProduct } from "@/lib/services/listings.service";
import { cn } from "@/lib/utils";

// Map category names (from DB) → icon + badge color
function getCategoryMeta(cat: string): { Icon: React.ElementType; badgeCls: string } {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("antibiotic") || c.includes("antimalarial") || c.includes("antiviral"))
    return { Icon: FlaskConical, badgeCls: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  if (c.includes("antihypertensive") || c.includes("cardiac") || c.includes("diuretic"))
    return { Icon: Heart, badgeCls: "bg-rose-50 text-rose-700 border-rose-200" };
  if (c.includes("antidiabetic") || c.includes("insulin"))
    return { Icon: Layers, badgeCls: "bg-violet-50 text-violet-700 border-violet-200" };
  if (c.includes("analgesic") || c.includes("nsaid") || c.includes("pain"))
    return { Icon: Pill, badgeCls: "bg-orange-50 text-orange-700 border-orange-200" };
  if (c.includes("respiratory") || c.includes("inhaler") || c.includes("bronch"))
    return { Icon: Package2, badgeCls: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  if (c.includes("vitamin") || c.includes("supplement") || c.includes("mineral"))
    return { Icon: Package2, badgeCls: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  if (c.includes("gastrointestinal") || c.includes("gastro"))
    return { Icon: Pill, badgeCls: "bg-teal-50 text-teal-700 border-teal-200" };
  if (c.includes("antihistamine"))
    return { Icon: Pill, badgeCls: "bg-pink-50 text-pink-700 border-pink-200" };
  return { Icon: Pill, badgeCls: "bg-slate-100 text-slate-600 border-slate-200" };
}

interface ListFormState {
  product: BackendProduct;
  price: string;
  stock: string;
  fulfillment: string;
}

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<ListFormState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      listingsService.listApprovedProducts({ offset: 0, limit: 100 }),
      listingsService.listMyListings({ offset: 0, limit: 100 }),
    ])
      .then(([catalogueResult, listingsResult]) => {
        if (cancelled) return;
        if (catalogueResult.status === "fulfilled") {
          setProducts(catalogueResult.value.items);
        } else {
          toast.error(getApiError(catalogueResult.reason, "Failed to load catalogue"));
        }
        if (listingsResult.status === "fulfilled") {
          setListedIds(new Set(listingsResult.value.items.map(l => l.product_id)));
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // Derive unique categories from loaded products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const matchesSearch = !q
        || p.name.toLowerCase().includes(q)
        || (p.brand ?? "").toLowerCase().includes(q)
        || (p.generic_name ?? "").toLowerCase().includes(q)
        || (p.manufacturer ?? "").toLowerCase().includes(q);
      const matchesCat = activeCategory === "All" || p.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, activeCategory]);

  const openDialog = (p: BackendProduct) => {
    setDialog({ product: p, price: "", stock: "0", fulfillment: "60" });
  };

  const handleSubmit = async () => {
    if (!dialog) return;
    const price = parseFloat(dialog.price);
    const stock = parseInt(dialog.stock, 10);
    const fulfillment = parseInt(dialog.fulfillment, 10);
    if (Number.isNaN(price) || price <= 0) { toast.error("Enter a valid price"); return; }
    if (Number.isNaN(stock) || stock < 0) { toast.error("Enter a valid stock quantity"); return; }
    if (Number.isNaN(fulfillment) || fulfillment < 0) { toast.error("Enter valid fulfillment time"); return; }
    setSubmitting(true);
    try {
      await listingsService.createListing({
        product_id: dialog.product.id,
        price,
        stock_quantity: stock,
        fulfillment_time_minutes: fulfillment,
      });
      toast.success(`${dialog.product.name} added to your listings`);
      setListedIds(prev => new Set([...prev, dialog.product.id]));
      setDialog(null);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to create listing"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Catalogue"
        description="FARUMASI-approved products you can list for sale"
        icon={Pill}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search products, brands…" className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
        </Button>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeCategory === cat
                  ? "bg-farumasi-600 text-white border-farumasi-600"
                  : "border-border hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading catalogue…
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No products match this filter.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(product => {
            const cat = product.category ?? "";
            const { Icon, badgeCls } = getCategoryMeta(cat);
            const isListed = listedIds.has(product.id);
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-farumasi-50 overflow-hidden flex items-center justify-center shrink-0 border border-farumasi-100">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <Icon className="w-6 h-6 text-farumasi-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-bold leading-snug line-clamp-2">{product.name}</CardTitle>
                      {product.generic_name && (
                        <p className="text-[11px] text-farumasi-600 font-medium mt-0.5 truncate">{product.generic_name}</p>
                      )}
                      {product.brand && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">by {product.brand}</p>
                      )}
                    </div>
                    {product.prescription_required && (
                      <span className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[9px] font-bold text-amber-700 uppercase tracking-wide">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Rx
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 flex flex-col flex-1">
                  {/* Category + dosage pill row */}
                  <div className="flex flex-wrap gap-1.5">
                    {cat && (
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", badgeCls)}>
                        {cat}
                      </span>
                    )}
                    {product.dosage_form && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600">
                        {product.dosage_form}
                      </span>
                    )}
                    {product.strength && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-100">
                        {product.strength}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {product.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{product.description}</p>
                  )}

                  {/* Manufacturer + country */}
                  <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    {product.manufacturer && (
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{product.manufacturer}</span>
                      </span>
                    )}
                    {product.country_of_origin && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Globe className="w-3 h-3" />
                        {product.country_of_origin}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="mt-auto pt-2">
                    {isListed ? (
                      <div className="flex items-center justify-center gap-1.5 h-8 text-xs text-green-700 bg-green-50 rounded-lg border border-green-200 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Already Listed
                      </div>
                    ) : (
                      <Button size="sm" className="w-full text-xs h-8" onClick={() => openDialog(product)}>
                        + List Product
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List product dialog */}
      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">List Product</DialogTitle>
            {dialog && (
              <p className="text-xs text-muted-foreground mt-1">{dialog.product.name}</p>
            )}
          </DialogHeader>
          {dialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (RWF) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 5000"
                  className="h-8 text-xs"
                  value={dialog.price}
                  onChange={e => setDialog(d => d ? { ...d, price: e.target.value } : d)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Stock Quantity <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 50"
                  className="h-8 text-xs"
                  value={dialog.stock}
                  onChange={e => setDialog(d => d ? { ...d, stock: e.target.value } : d)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fulfillment Time (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  placeholder="e.g. 60"
                  className="h-8 text-xs"
                  value={dialog.fulfillment}
                  onChange={e => setDialog(d => d ? { ...d, fulfillment: e.target.value } : d)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "List Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
