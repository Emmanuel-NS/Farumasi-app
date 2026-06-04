"use client";

import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProductSortKey =
  | "name_asc"
  | "name_desc"
  | "category"
  | "rx_first"
  | "price_asc"
  | "price_desc"
  | "stock_asc"
  | "stock_desc";

export type ProductViewMode = "grid" | "table";

interface ProductsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sort: ProductSortKey;
  onSortChange: (v: ProductSortKey) => void;
  view: ProductViewMode;
  onViewChange: (v: ProductViewMode) => void;
  resultCount: number;
  totalCount?: number;
  loading?: boolean;
  children?: React.ReactNode;
  sortOptions?: { value: ProductSortKey; label: string }[];
}

const DEFAULT_SORT: { value: ProductSortKey; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "category", label: "Category" },
  { value: "rx_first", label: "Prescription first" },
];

export function ProductsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  resultCount,
  totalCount,
  loading,
  children,
  sortOptions = DEFAULT_SORT,
}: ProductsToolbarProps) {
  const total = totalCount ?? resultCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, brand, generic, manufacturer…"
            className="pl-9 h-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={(v) => onSortChange(v as ProductSortKey)}>
          <SelectTrigger className="w-[180px] h-10 text-sm">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-sm">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-white">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={cn(
              "p-2 rounded-md transition-colors",
              view === "grid" ? "bg-farumasi-600 text-white" : "text-muted-foreground hover:bg-slate-50",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("table")}
            className={cn(
              "p-2 rounded-md transition-colors",
              view === "table" ? "bg-farumasi-600 text-white" : "text-muted-foreground hover:bg-slate-50",
            )}
            aria-label="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {children}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {loading ? (
          "Loading from catalogue…"
        ) : (
          <>
            Showing <span className="font-semibold text-foreground">{resultCount}</span>
            {total !== resultCount ? (
              <> of <span className="font-semibold text-foreground">{total}</span></>
            ) : null}{" "}
            {resultCount === 1 ? "product" : "products"}
          </>
        )}
      </p>
    </div>
  );
}
