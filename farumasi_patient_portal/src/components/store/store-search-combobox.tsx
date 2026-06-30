"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
import { useStoreFilterStore, storeActiveFilterCount } from "@/store/store-filter-store";
import { productsService } from "@/lib/services/products.service";
import {
  getSearchSuggestions,
  suggestQueryCorrection,
} from "@/lib/store-search";
import type { Medicine } from "@/types";
import { StoreFilterButton } from "@/components/store/store-filter-button";

interface StoreSearchComboboxProps {
  variant?: "desktop" | "mobile";
  showFilter?: boolean;
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function StoreSearchCombobox({
  variant = "desktop",
  showFilter = true,
  onClose,
  autoFocus = false,
  className,
}: StoreSearchComboboxProps) {
  const router = useRouter();
  const { query, setQuery, clear } = useSearchStore();
  const clearStoreFilters = useStoreFilterStore((s) => s.clearAll);
  const storeFilterCount = storeActiveFilterCount(query);

  const [catalog, setCatalog] = useState<Medicine[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query, 180);
  const isMobile = variant === "mobile";

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    productsService
      .getAllProducts()
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q || catalog.length === 0) return [];
    return getSearchSuggestions(catalog, q, 8);
  }, [catalog, debouncedQuery]);

  const correction = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q || catalog.length === 0) return null;
    return suggestQueryCorrection(catalog, q);
  }, [catalog, debouncedQuery]);

  const showPanel =
    open &&
    debouncedQuery.trim().length > 0 &&
    (catalogLoading || suggestions.length > 0 || correction != null);

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [closePanel]);

  const selectSuggestion = useCallback(
    (medicine: Medicine) => {
      setQuery(medicine.name);
      closePanel();
      onClose?.();
      router.push(`/store/${medicine.id}`);
    },
    [closePanel, onClose, router, setQuery],
  );

  const applyCorrection = useCallback(() => {
    if (!correction) return;
    setQuery(correction);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, [correction, setQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) {
      if (event.key === "ArrowDown" && debouncedQuery.trim()) {
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex].medicine);
      } else if (correction) {
        applyCorrection();
      } else {
        closePanel();
        onClose?.();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      if (isMobile) onClose?.();
    }
  };

  const inputClasses = isMobile
    ? "flex-1 min-w-0 bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
    : "flex-1 min-w-0 text-sm text-[#0F172A] placeholder:text-slate-400 outline-none bg-transparent";

  const shellClasses = isMobile
    ? "flex items-center gap-2"
    : "flex items-center bg-white rounded-[14px] h-12 px-3 lg:px-4 gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-md transition-shadow";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className={shellClasses}>
        <Search
          className={cn(
            "shrink-0",
            isMobile ? "w-4 h-4 text-white/60" : "w-5 h-5 text-slate-400",
          )}
        />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            isMobile ? "Search medicines…" : "Search medicines, symptoms, categories..."
          }
          className={inputClasses}
          role="combobox"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          aria-controls="store-search-suggestions"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              clear();
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className={cn(
              "shrink-0",
              isMobile ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-slate-600",
            )}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {showFilter && !isMobile && (
          <>
            <div className="w-px h-7 bg-slate-200 shrink-0" aria-hidden />
            <StoreFilterButton embedded />
            {storeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => clearStoreFilters()}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors"
                aria-label="Clear all filters"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {showPanel && (
        <div
          id="store-search-suggestions"
          role="listbox"
          className={cn(
            "absolute z-[80] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl",
            isMobile ? "left-0 right-0 top-full mt-2" : "left-0 right-0 top-[calc(100%+8px)]",
          )}
        >
          {correction && (
            <button
              type="button"
              onClick={applyCorrection}
              className="w-full px-4 py-2.5 text-left text-xs text-slate-500 border-b border-slate-100 hover:bg-slate-50"
            >
              Did you mean{" "}
              <span className="font-semibold text-farumasi-700">{correction}</span>?
            </button>
          )}

          {catalogLoading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-farumasi-600" />
              Searching…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">No matches found</div>
          ) : (
            <ul className="max-h-[min(360px,50vh)] overflow-y-auto py-1">
              {suggestions.map(({ medicine }, index) => (
                <li key={medicine.id} role="option" aria-selected={activeIndex === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectSuggestion(medicine)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      activeIndex === index ? "bg-farumasi-50" : "hover:bg-slate-50",
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {medicine.imageUrl ? (
                        <img
                          src={medicine.imageUrl}
                          alt=""
                          className="w-full h-full object-contain p-1"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{medicine.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {medicine.category.split(",")[0]?.trim()}
                        {medicine.price > 0 ? ` · from ${formatPrice(medicine.price)}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
