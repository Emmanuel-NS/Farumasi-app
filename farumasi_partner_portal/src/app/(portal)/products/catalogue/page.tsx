"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Pill, FlaskConical, Heart, Package2, Loader2, CheckCircle2,
  ShieldCheck, Building2, Globe, Layers, Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { listingsService, type BackendProduct } from "@/lib/services/listings.service";
import { cn, mediaUrl } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ProductInsightsStrip } from "@/components/products/product-insights-strip";
import {
  ProductsToolbar,
  type ProductSortKey,
  type ProductViewMode,
} from "@/components/products/products-toolbar";
import { sortProducts } from "@/lib/product-sort";

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

type ListedFilter = "all" | "listed" | "not_listed";
type RxFilter = "all" | "rx" | "otc";

interface ListFormState {
  product: BackendProduct;
  price: string;
  unitPrice: string;
  stock: string;
  fulfillment: string;
}

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [activeCategory, setActiveCategory] = useState("All");
  const [listedFilter, setListedFilter] = useState<ListedFilter>("all");
  const [rxFilter, setRxFilter] = useState<RxFilter>("all");
  const [sort, setSort] = useState<ProductSortKey>("name_asc");
  const [view, setView] = useState<ProductViewMode>("grid");
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const PAGE = 100;
  const [listedIds, setListedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<ListFormState | null>(null);

  const fetchPage = useCallback(
    async (pageOffset: number, append: boolean) => {
      setLoading(true);
      try {
        const [catalogueRes, listingsRes] = await Promise.all([
          listingsService.listApprovedProducts({
            offset: pageOffset,
            limit: PAGE,
            search: debouncedSearch || undefined,
            category: activeCategory !== "All" ? activeCategory : undefined,
          }),
          listingsService.listMyListings({ offset: 0, limit: 100 }),
        ]);
        setProducts((prev) => (append ? [...prev, ...catalogueRes.items] : catalogueRes.items));
        setTotal(catalogueRes.total);
        setOffset(pageOffset + catalogueRes.items.length);
        setListedIds(new Set(listingsRes.items.map((l) => l.product_id)));
      } catch (err: unknown) {
        toast.error(getApiError(err, "Failed to load catalogue"));
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, activeCategory],
  );

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = () => {
    if (offset < total && !loading) fetchPage(offset, true);
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (listedFilter === "listed") list = list.filter((p) => listedIds.has(p.id));
    if (listedFilter === "not_listed") list = list.filter((p) => !listedIds.has(p.id));
    if (rxFilter === "rx") list = list.filter((p) => p.prescription_required);
    if (rxFilter === "otc") list = list.filter((p) => !p.prescription_required);
    return sortProducts(list, sort);
  }, [products, listedIds, listedFilter, rxFilter, sort]);

  const insights = useMemo(() => {
    const listed = products.filter((p) => listedIds.has(p.id)).length;
    const rx = products.filter((p) => p.prescription_required).length;
    const cats = new Set(products.map((p) => p.category).filter(Boolean)).size;
    return { listed, rx, cats };
  }, [products, listedIds]);

  const openDialog = (p: BackendProduct) => {
    setDialog({ product: p, price: "", unitPrice: "", stock: "0", fulfillment: "60" });
  };

  const handleSubmit = async () => {
    if (!dialog) return;
    const price = parseFloat(dialog.price);
    const stock = parseInt(dialog.stock, 10);
    const fulfillment = parseInt(dialog.fulfillment, 10);
    if (Number.isNaN(price) || price <= 0) { toast.error("Enter a valid price"); return; }
    if (Number.isNaN(stock) || stock < 0) { toast.error("Enter a valid stock quantity"); return; }
    if (Number.isNaN(fulfillment) || fulfillment < 0) { toast.error("Enter valid fulfillment time"); return; }
    const allowsPartial = dialog.product.allows_partial_selling ?? false;
    const unitPriceRaw = dialog.unitPrice.trim();
    const unitPrice = unitPriceRaw ? parseFloat(unitPriceRaw) : null;
    if (allowsPartial && (unitPrice == null || Number.isNaN(unitPrice) || unitPrice <= 0)) {
      toast.error(`Enter a valid per-${dialog.product.partial_unit_name ?? "unit"} price`);
      return;
    }
    setSubmitting(true);
    try {
      await listingsService.createListing({
        product_id: dialog.product.id,
        price,
        unit_price: allowsPartial ? unitPrice : null,
        stock_quantity: stock,
        fulfillment_time_minutes: fulfillment,
      });
      toast.success(`${dialog.product.name} added to your listings`);
      setListedIds((prev) => new Set([...prev, dialog.product.id]));
      setDialog(null);
      await fetchPage(0, false);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to create listing"));
    } finally {
      setSubmitting(false);
    }
  };

  const filterPill = (active: boolean) =>
    cn(
      "text-xs px-3 py-1.5 rounded-full border transition-colors font-medium",
      active ? "bg-farumasi-600 text-white border-farumasi-600" : "border-border bg-white hover:bg-slate-50",
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Catalogue"
        description="Medical devices, supplements, and cosmetics only — medicines are stocked exclusively by licensed pharmacies on FARUMASI."
        icon={Pill}
      />

      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>FDA compliance:</strong> Partner companies cannot list pharmaceuticals. Browse non-medicine products below and mark your stock as available after verification.
      </div>

      <ProductInsightsStrip
        stats={[
          { label: "In catalogue", value: total, hint: "Approved products (API)", icon: Pill },
          { label: "You already list", value: insights.listed, hint: "Your active listings", icon: CheckCircle2, iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Prescription (Rx)", value: insights.rx, icon: ShieldCheck, iconBg: "bg-amber-50", iconColor: "text-amber-700" },
          { label: "Categories", value: insights.cats, icon: Layers, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
        ]}
      />

      <ProductsToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        resultCount={filtered.length}
        totalCount={total}
        loading={loading}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Category</span>
        {categories.slice(0, 8).map((cat) => (
          <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={filterPill(activeCategory === cat)}>
            {cat}
          </button>
        ))}
        {categories.length > 8 && (
          <span className="text-[10px] text-muted-foreground">+{categories.length - 8} more in results</span>
        )}
        <span className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Listing</span>
        {(["all", "not_listed", "listed"] as ListedFilter[]).map((f) => (
          <button key={f} type="button" onClick={() => setListedFilter(f)} className={filterPill(listedFilter === f)}>
            {f === "all" ? "All" : f === "listed" ? "Already listed" : "Not listed"}
          </button>
        ))}
        <span className="w-px h-5 bg-border mx-1 hidden sm:block" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
        {(["all", "rx", "otc"] as RxFilter[]).map((f) => (
          <button key={f} type="button" onClick={() => setRxFilter(f)} className={filterPill(rxFilter === f)}>
            {f === "all" ? "All" : f === "rx" ? "Rx only" : "OTC only"}
          </button>
        ))}
      </ProductsToolbar>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading catalogue from API…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No products match your filters. Try clearing search or choosing &quot;All&quot; categories.
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Listed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const isListed = listedIds.has(product.id);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        <div className="w-9 h-9 rounded-lg bg-farumasi-50 overflow-hidden shrink-0 border">
                          {product.image_url ? (
                            <Image src={mediaUrl(product.image_url)} alt="" width={36} height={36} className="object-cover w-full h-full" />
                          ) : (
                            <Pill className="w-4 h-4 m-auto text-farumasi-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{product.name}</p>
                          {product.brand && <p className="text-[10px] text-muted-foreground truncate">{product.brand}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{product.category ?? "—"}</TableCell>
                    <TableCell className="text-xs">{product.strength ?? "—"}</TableCell>
                    <TableCell>
                      {isListed ? (
                        <span className="text-[10px] font-semibold text-green-700">Listed</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isListed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                      ) : (
                        <Button size="sm" className="h-7 text-xs" onClick={() => openDialog(product)}>
                          <Plus className="w-3 h-3 mr-1" /> List
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const cat = product.category ?? "";
            const { Icon, badgeCls } = getCategoryMeta(cat);
            const isListed = listedIds.has(product.id);
            const img = mediaUrl(product.image_url);
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-farumasi-50 overflow-hidden flex items-center justify-center shrink-0 border border-farumasi-100">
                      {img ? (
                        <Image src={img} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
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
                  {product.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{product.description}</p>
                  )}
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

      {!loading && offset < total && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore}>
            Load more ({products.length} of {total})
          </Button>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">List Product</DialogTitle>
            {dialog && <p className="text-xs text-muted-foreground mt-1">{dialog.product.name}</p>}
          </DialogHeader>
          {dialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {dialog.product.allows_partial_selling ? "Pack / box price (RWF)" : "Price (RWF)"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input type="number" min="0" step="1" placeholder="e.g. 5000" className="h-8 text-xs" value={dialog.price} onChange={(e) => setDialog((d) => (d ? { ...d, price: e.target.value } : d))} />
              </div>
              {dialog.product.allows_partial_selling && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Per-{dialog.product.partial_unit_name ?? "unit"} price (RWF) <span className="text-red-500">*</span>
                  </Label>
                  <Input type="number" min="0" step="1" placeholder="e.g. 200" className="h-8 text-xs" value={dialog.unitPrice} onChange={(e) => setDialog((d) => (d ? { ...d, unitPrice: e.target.value } : d))} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Initial Stock Quantity <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" step="1" placeholder="e.g. 50" className="h-8 text-xs" value={dialog.stock} onChange={(e) => setDialog((d) => (d ? { ...d, stock: e.target.value } : d))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fulfillment Time (minutes)</Label>
                <Input type="number" min="0" step="5" placeholder="e.g. 60" className="h-8 text-xs" value={dialog.fulfillment} onChange={(e) => setDialog((d) => (d ? { ...d, fulfillment: e.target.value } : d))} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialog(null)} disabled={submitting}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "List Product"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
