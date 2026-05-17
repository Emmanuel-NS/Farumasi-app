"use client";

import { useState } from "react";
import Link from "next/link";
import { mockInventory } from "@/data/mock";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { Package, Plus, AlertTriangle, Search, Edit, RefreshCw } from "lucide-react";
import type { InventoryItem } from "@/types";

export default function InventoryPage() {
  const [items, setItems] = useState(mockInventory);
  const [search, setSearch] = useState("");

  const lowStockItems = items.filter((i) => i.stockStatus === "low_stock" || i.stockStatus === "out_of_stock");

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">{items.length} total items in stock</p>
        </div>
        <Link
          href="/inventory/new"
          className="flex items-center gap-2 px-4 py-2 bg-farumasi-600 hover:bg-farumasi-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Link>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} need restocking
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStockItems.map((i) => i.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or category…"
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-farumasi-500/30 focus:border-farumasi-500 transition-all"
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-farumasi-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-base font-bold text-slate-900">{item.name}</p>
                  {item.requiresPrescription && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">Rx</span>
                  )}
                </div>
                <p className="text-xs text-slate-500">SKU: {item.sku} · {item.category} · {item.supplier}</p>
                <div className="flex flex-wrap gap-3 mt-2">
                  {/* Stock */}
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Stock</p>
                    <p className={cn(
                      "text-sm font-bold",
                      item.stockStatus === "out_of_stock" ? "text-red-600" :
                      item.stockStatus === "low_stock" ? "text-amber-600" : "text-farumasi-700"
                    )}>
                      {item.stock} units
                      {item.stockStatus === "low_stock" && <span className="ml-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Low</span>}
                      {item.stockStatus === "out_of_stock" && <span className="ml-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Out</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Min Stock</p>
                    <p className="text-sm font-semibold text-slate-700">{item.minStock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Unit Price</p>
                    <p className="text-sm font-bold text-slate-900">{formatPrice(item.unitPrice)} RWF</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Expiry</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(item.expiryDate)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button className="p-2 rounded-xl text-slate-400 hover:text-farumasi-600 hover:bg-farumasi-50 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                {(item.stockStatus === "low_stock" || item.stockStatus === "out_of_stock") && (
                  <button className="p-2 rounded-xl text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
