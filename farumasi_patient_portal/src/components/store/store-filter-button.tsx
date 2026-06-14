"use client";

import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { useSearchStore } from "@/store/search-store";
import {
  useStoreFilterStore,
  storeActiveFilterCount,
} from "@/store/store-filter-store";

interface StoreFilterButtonProps {
  className?: string;
  /** Tighter styling for embedding in the topbar search field */
  embedded?: boolean;
  /** Icon-only control for narrow topbar (search collapsed to icon) */
  iconOnly?: boolean;
}

export function StoreFilterButton({
  className,
  embedded = false,
  iconOnly = false,
}: StoreFilterButtonProps) {
  const t = useTranslation();
  const query = useSearchStore((s) => s.query);
  const sort = useStoreFilterStore((s) => s.sort);
  const showFilters = useStoreFilterStore((s) => s.showFilters);
  const toggleShowFilters = useStoreFilterStore((s) => s.toggleShowFilters);
  const activeFilterCount = storeActiveFilterCount(query);

  const sortLabel =
    sort === "name_asc"
      ? t.store_sort_name_asc
      : sort === "name_desc"
        ? t.store_sort_name_desc
        : null;

  const active = showFilters || activeFilterCount > 0;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => toggleShowFilters()}
        className={cn(
          "relative p-2 rounded-lg transition-colors shrink-0",
          active ? "bg-white/25 text-white" : "text-white/80 hover:text-white hover:bg-white/10",
          className,
        )}
        aria-expanded={showFilters}
        aria-label={
          activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"
        }
        title="Filters"
      >
        <SlidersHorizontal className="w-5 h-5" />
        {activeFilterCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-amber-400 text-[10px] font-extrabold text-white rounded-full flex items-center justify-center px-0.5 leading-none">
            {activeFilterCount > 9 ? "9+" : activeFilterCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
      {sortLabel && !embedded && (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-farumasi-50 text-farumasi-700 border border-farumasi-200"
          title={t.store_sort_by}
        >
          {sortLabel}
        </span>
      )}
      <button
        type="button"
        onClick={() => toggleShowFilters()}
        className={cn(
          "flex items-center gap-1.5 font-medium transition-all shrink-0",
          embedded
            ? cn(
                "px-2.5 py-1 rounded-lg text-xs",
                active ? "bg-farumasi-600 text-white" : "text-slate-600 hover:bg-slate-100",
              )
            : cn(
                "px-3 py-1.5 rounded-xl border text-sm",
                active
                  ? "bg-farumasi-600 text-white border-farumasi-600"
                  : "border-slate-200 text-slate-600 hover:border-farumasi-400 bg-[#F3F6FA]",
              ),
        )}
        aria-expanded={showFilters}
        aria-label={
          activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"
        }
      >
        <SlidersHorizontal className={cn(embedded ? "w-3.5 h-3.5" : "w-4 h-4")} />
        <span>
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </span>
      </button>
    </div>
  );
}
