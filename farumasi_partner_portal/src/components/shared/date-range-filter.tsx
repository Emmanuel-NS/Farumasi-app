"use client";

import { cn } from "@/lib/utils";

export const DATE_RANGES = [
  { label: "Today",        value: "today"    },
  { label: "This Week",    value: "week"     },
  { label: "Last 14 Days", value: "14d"      },
  { label: "This Month",   value: "month"    },
  { label: "Last 3 Months",value: "3months"  },
  { label: "This Year",    value: "year"     },
] as const;

export type DateRangeValue = typeof DATE_RANGES[number]["value"];

export const RANGE_LABELS: Record<DateRangeValue, string> = {
  today:    "Today",
  week:     "This week",
  "14d":    "Last 14 days",
  month:    "This month",
  "3months":"Last 3 months",
  year:     "This year",
};

/** Returns the start Date for the given range (end is always now). */
export function getDateRangeStart(range: DateRangeValue): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // ISO week starts Monday
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
    }
    case "14d":
      return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "3months":
      return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {DATE_RANGES.map(r => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            "h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap",
            value === r.value
              ? "bg-farumasi-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
