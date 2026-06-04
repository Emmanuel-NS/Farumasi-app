"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface ProductInsightStat {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}

interface ProductInsightsStripProps {
  stats: ProductInsightStat[];
  className?: string;
}

export function ProductInsightsStrip({ stats, className }: ProductInsightsStripProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-3"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                s.iconBg ?? "bg-farumasi-50",
              )}
            >
              <Icon className={cn("w-5 h-5", s.iconColor ?? "text-farumasi-600")} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground leading-none">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{s.value}</p>
              {s.hint && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.hint}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
