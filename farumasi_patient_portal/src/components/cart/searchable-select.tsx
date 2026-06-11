"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Search…",
  disabled = false,
  emptyLabel = "No matches",
  allowCustom = false,
  customMinLength = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  /** Let the user confirm a neighbourhood not in the list */
  allowCustom?: boolean;
  customMinLength?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const trimmed = query.trim();
  const exactMatch = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
  const showCustom =
    allowCustom && trimmed.length >= customMinLength && !exactMatch;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (next: string) => {
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "w-full h-11 rounded-2xl border border-slate-200 px-4 flex items-center gap-2 bg-white transition-all",
          "focus-within:border-farumasi-400 focus-within:ring-2 focus-within:ring-farumasi-100",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : value}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setQuery(value);
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400 bg-transparent min-w-0"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            if (!open) inputRef.current?.focus();
          }}
          className="shrink-0 p-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Toggle neighbourhood list"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {showCustom && (
              <li>
                <button
                  type="button"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-farumasi-50 transition-colors flex items-center gap-2 text-farumasi-700 font-semibold border-b border-slate-100"
                  onClick={() => pick(trimmed)}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Use &ldquo;{trimmed}&rdquo;
                </button>
              </li>
            )}
            {filtered.length === 0 && !showCustom ? (
              <li className="px-4 py-3 text-xs text-slate-400">{emptyLabel}</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-farumasi-50 transition-colors",
                      value === opt && "bg-farumasi-50 text-farumasi-800 font-semibold",
                    )}
                    onClick={() => pick(opt)}
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
