"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { mockInventory } from "@/data/mock";
import { formatPrice, formatDate, cn, formatPriceRange } from "@/lib/utils";
import {
  Plus, AlertTriangle, Search, Edit, RefreshCw,
  X, ChevronLeft, ChevronRight,
  MoreVertical, Trash2, Eye, EyeOff, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem, StockStatus } from "@/types";

/* â”€â”€â”€ Category hierarchy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const CATEGORY_LIST = [
  "All", "Pain Relief", "Antibiotics", "Allergy & Asthma", "Cold & Flu",
  "Digestive Health", "Chronic Care", "Supplements", "Personal Care",
  "Antimalarial", "First Aid", "Wellness",
];

/* â”€â”€â”€ Status badge helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatusBadge({ status }: { status: StockStatus }) {
  const styles: Record<StockStatus, string> = {
    in_stock:     "bg-farumasi-50 text-farumasi-700 border border-farumasi-200",
    low_stock:    "bg-orange-50 text-orange-700 border border-orange-200",
    out_of_stock: "bg-red-50 text-red-700 border border-red-200",
  };
  const labels: Record<StockStatus, string> = {
    in_stock: "In Stock", low_stock: "Low Stock", out_of_stock: "Out of Stock",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap", styles[status])}>
      {labels[status]}
    </span>
  );
}

/* â”€â”€â”€ Product card action menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface CardMenuProps {
  onEdit: () => void;
  onRestock: () => void;
  onTogglePublish: () => void;
  isPublished: boolean;
}
function CardMenu({ onEdit, onRestock, onTogglePublish, isPublished }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white rounded-2xl border border-slate-100 shadow-xl z-30 min-w-[150px] py-1.5 overflow-hidden">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-farumasi-50 text-farumasi-700 flex items-center gap-2.5 transition-colors font-medium">
            <Edit className="w-3.5 h-3.5" /> Edit Product
          </button>
          <button onClick={() => { onRestock(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 text-amber-700 flex items-center gap-2.5 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Restock
          </button>
          <button onClick={() => { onTogglePublish(); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-600 flex items-center gap-2.5 transition-colors">
            {isPublished ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
          </button>
          <div className="mx-3 my-1 border-t border-slate-100" />
          <button onClick={() => setOpen(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2.5 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€ Restock modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function RestockModal({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (id: number, qty: number) => void }) {
  const [qty, setQty] = useState(item.minStock * 2);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Restock â€” {item.name}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 mb-4">
          <p className="text-sm text-amber-700 font-semibold">Current: <strong>{item.stock} units</strong></p>
          <p className="text-xs text-amber-600 mt-0.5">Min required: {item.minStock} units</p>
        </div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">Units to Add</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200 mb-2" />
        <p className="text-xs text-slate-500 mb-4">New total: <strong>{item.stock + qty} units</strong></p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          <button onClick={() => { onSave(item.id, qty); onClose(); }} className="flex-1 py-2.5 rounded-xl bg-farumasi-600 text-white text-sm font-bold hover:bg-farumasi-700 transition-colors">
            Confirm Restock
          </button>
        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Quick Edit modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */


/* â”€â”€â”€ withStatus helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const withStatus = (i: InventoryItem): InventoryItem => ({
  ...i,
  stockStatus: i.stock === 0 ? "out_of_stock" : i.stock <= i.minStock ? "low_stock" : "in_stock",
});

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function InventoryPage() {
  const router = useRouter();
  const [items, setItems]             = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);

  const chipRef = useRef<HTMLDivElement>(null);
  const scrollChips = (dir: "l" | "r") => chipRef.current?.scrollBy({ left: dir === "l" ? -160 : 160, behavior: "smooth" });

  const handleRestock = (id: number, qty: number) => {
    setItems((p) => p.map((i) => i.id === id ? withStatus({ ...i, stock: i.stock + qty }) : i));
    toast.success("Stock updated");
  };
  const togglePublish = (id: number) => {
    setItems((p) => p.map((i) => i.id === id ? { ...i, isPublished: !i.isPublished } : i));
    const item = items.find((i) => i.id === id);
    toast.success(item?.isPublished ? "Product unpublished" : "Product published");
  };

  const filtered = useMemo(() => {
    let list = items.map(withStatus);
    if (search.trim()) list = list.filter((i) => [i.name, i.manufacturer, i.category, i.sku].some((v) => v.toLowerCase().includes(search.toLowerCase())));
    if (category !== "All") list = list.filter((i) => i.category === category || i.additionalCategories.includes(category));
    return list;
  }, [items, search, category]);

  const alertCount = items.filter((i) => withStatus(i).stockStatus !== "in_stock").length;

  return (
    <div className="flex flex-col h-full">
      {/* â”€â”€ Search + actions bar â”€â”€ */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stock..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-farumasi-200 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
          </div>
          <button className="p-2.5 rounded-xl bg-slate-100 hover:bg-farumasi-50 text-slate-500 hover:text-farumasi-600 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-1">
          <button onClick={() => scrollChips("l")} className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div ref={chipRef} className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
            {CATEGORY_LIST.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                  category === c ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300")}>
                {c === "All" && category === "All" && <span className="mr-1 text-[10px]">&#10003;</span>}{c}
              </button>
            ))}
          </div>
          <button onClick={() => scrollChips("r")} className="shrink-0 p-1 text-farumasi-600 hover:bg-farumasi-50 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* â”€â”€ Low-stock alert strip â”€â”€ */}
      {alertCount > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-800">{alertCount} item{alertCount !== 1 ? "s" : ""} need restocking or are out of stock</p>
        </div>
      )}

      {/* â”€â”€ Product grid â”€â”€ */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center text-center">
            <Search className="w-14 h-14 text-slate-200 mb-3" />
            <p className="text-slate-600 font-semibold">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id}
                className={cn("bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer",
                  !item.isPublished ? "opacity-60 border-slate-200" : item.stockStatus === "out_of_stock" ? "border-red-100" : item.stockStatus === "low_stock" ? "border-orange-100" : "border-slate-200")}>
                <div className="flex items-center gap-3 px-3 py-3">
                  {/* Product image */}
                  <div className="relative w-[60px] h-[60px] shrink-0 rounded-xl overflow-hidden bg-slate-100">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="60px"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">ðŸ’Š</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{item.name}</p>
                      {!item.isPublished && (
                        <span className="shrink-0 text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase">Draft</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mb-1.5">{item.manufacturer}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-extrabold text-slate-900">{formatPriceRange(item.marketPriceMin, item.marketPriceMax)}</p>
                    </div>
                  </div>

                  {/* Action menu */}
                  <div className="shrink-0">
                    <CardMenu
                      onEdit={() => router.push(`/inventory/${item.id}/edit`)}
                      onRestock={() => setRestockItem(item)}
                      onTogglePublish={() => togglePublish(item.id)}
                      isPublished={item.isPublished}
                    />
                  </div>
                </div>

                {/* Bottom meta strip */}
                <div className="border-t border-slate-50 px-3 py-2 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">{item.sku} &ndash; {item.category}</p>
                  <div className="flex items-center gap-1.5">
                    {item.requiresPrescription && (
                      <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">Rx</span>
                    )}
                    <StatusBadge status={item.stockStatus} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ FAB â”€â”€ */}
      <Link href="/inventory/new"
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-farumasi-600 hover:bg-farumasi-700 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all text-sm z-20">
        <Plus className="w-5 h-5" /> New Product
      </Link>

      {restockItem && <RestockModal item={restockItem} onClose={() => setRestockItem(null)} onSave={handleRestock} />}
    </div>
  );
}
