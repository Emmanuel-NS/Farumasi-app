"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Filter, Pill, FlaskConical, Thermometer, Heart, Package2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { listingsService, type BackendProduct } from "@/lib/services/listings.service";

const categoryIcons: Record<string, React.ElementType> = {
  medicines: Pill,
  medical_devices: Heart,
  diagnostics: FlaskConical,
  supplements: Package2,
  consumables: Thermometer,
};

const categoryColors: Record<string, "info" | "purple" | "warning" | "success" | "neutral"> = {
  medicines: "info",
  medical_devices: "purple",
  diagnostics: "warning",
  supplements: "success",
  consumables: "neutral",
};

const CAT_MAP: Record<string, string> = {
  Medicines: "medicines",
  Devices: "medical_devices",
  Diagnostics: "diagnostics",
  Supplements: "supplements",
  Consumables: "consumables",
};
const categories = ["All", "Medicines", "Devices", "Diagnostics", "Supplements", "Consumables"];

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listingsService
      .listApprovedProducts({ offset: 0, limit: 100 })
      .then(res => !cancelled && setProducts(res.items))
      .catch(err => !cancelled && toast.error(getApiError(err, "Failed to load catalogue")))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      const matchesSearch = !q
        || p.name.toLowerCase().includes(q)
        || (p.brand ?? "").toLowerCase().includes(q)
        || (p.generic_name ?? "").toLowerCase().includes(q);
      const matchesCat = activeCategory === "All" || p.category === CAT_MAP[activeCategory];
      return matchesSearch && matchesCat;
    });
  }, [products, search, activeCategory]);

  const handleList = async (p: BackendProduct) => {
    const priceStr = window.prompt(`Set price (RWF) for "${p.name}":`, "");
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (Number.isNaN(price) || price <= 0) {
      toast.error("Invalid price");
      return;
    }
    const stockStr = window.prompt("Initial stock quantity:", "0");
    if (stockStr === null) return;
    const stock = parseInt(stockStr, 10);
    if (Number.isNaN(stock) || stock < 0) {
      toast.error("Invalid stock");
      return;
    }
    setAdding(p.id);
    try {
      await listingsService.createListing({ product_id: p.id, price, stock_quantity: stock });
      toast.success(`${p.name} added to your listings`);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to create listing"));
    } finally {
      setAdding(null);
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
          <Filter className="w-3.5 h-3.5" /> Filter
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
            const Icon = categoryIcons[cat] ?? Package2;
            const badgeVariant = categoryColors[cat] ?? "neutral";
            return (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <Icon className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm leading-snug line-clamp-2">{product.name}</CardTitle>
                      {product.generic_name && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{product.generic_name}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {cat && <Badge variant={badgeVariant} className="capitalize">{cat.replace("_", " ")}</Badge>}
                    {product.prescription_required && (
                      <Badge variant="warning">Prescription Required</Badge>
                    )}
                    {product.dosage_form && (
                      <Badge variant="neutral">{product.dosage_form}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {product.brand && (
                      <div>
                        <p className="text-muted-foreground">Brand</p>
                        <p className="font-medium">{product.brand}</p>
                      </div>
                    )}
                    {product.manufacturer && (
                      <div>
                        <p className="text-muted-foreground">Manufacturer</p>
                        <p className="font-medium truncate">{product.manufacturer}</p>
                      </div>
                    )}
                    {product.strength && (
                      <div>
                        <p className="text-muted-foreground">Strength</p>
                        <p className="font-medium">{product.strength}</p>
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-7"
                      disabled={adding === product.id}
                      onClick={() => handleList(product)}
                    >
                      {adding === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "+ List Product"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
