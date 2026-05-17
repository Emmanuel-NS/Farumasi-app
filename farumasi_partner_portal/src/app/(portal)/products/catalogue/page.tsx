"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Filter, Pill, FlaskConical, Thermometer, Heart, Package2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockApprovedProducts } from "@/data/mock";
import { toast } from "@/lib/toast";

const categoryIcons: Record<string, React.ElementType> = {
  medicines: Pill,
  medical_devices: Heart,
  diagnostics: FlaskConical,
  supplements: Package2,
  consumables: Thermometer,
};

const categoryColors: Record<string, string> = {
  medicines: "info",
  medical_devices: "purple",
  diagnostics: "warning",
  supplements: "success",
  consumables: "neutral",
};

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Medicines", "Devices", "Diagnostics", "Supplements", "Consumables"];

  const filtered = mockApprovedProducts.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q) || (p.genericName ?? "").toLowerCase().includes(q);
    const catMap: Record<string, string> = { Medicines: "medicines", Devices: "medical_devices", Diagnostics: "diagnostics", Supplements: "supplements", Consumables: "consumables" };
    const matchesCat = activeCategory === "All" || p.category === catMap[activeCategory];
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Catalogue"
        description="FARUMASI-approved products you can list for sale"
        icon={Pill}
      />

      {/* Filter bar */}
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

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(product => {
          const Icon = categoryIcons[product.category] ?? Package2;
          const badgeVariant = (categoryColors[product.category] ?? "neutral") as any;
          return (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <Icon className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm leading-snug line-clamp-2">{product.name}</CardTitle>
                    {product.genericName && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{product.genericName}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={badgeVariant} className="capitalize">{product.category.replace("_", " ")}</Badge>
                  {product.requiresPrescription && (
                    <Badge variant="warning">Prescription Required</Badge>
                  )}
                  {product.dosageForm && (
                    <Badge variant="neutral">{product.dosageForm}</Badge>
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
                  {product.rfidaApprovalNo && (
                    <div>
                      <p className="text-muted-foreground">RFDA No.</p>
                      <p className="font-medium font-mono text-[10px]">{product.rfidaApprovalNo}</p>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2">{product.description}</p>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1 text-xs h-7" onClick={() => toast.success(`${product.name} added to your listings`)}>+ List Product</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 px-3" onClick={() => toast.info(`Viewing details for ${product.name}`)}>Details</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
