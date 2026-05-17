import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function KpiCard({ title, value, delta, deltaLabel, icon: Icon, iconColor = "text-farumasi-600", iconBg = "bg-farumasi-100", className }: KpiCardProps) {
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;
  const isNeutral = delta === 0;

  return (
    <div className={cn("bg-white rounded-xl border border-border p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
          {delta !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-slate-500")}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>{isPositive ? "+" : ""}{delta}%</span>
              {deltaLabel && <span className="text-muted-foreground font-normal">{deltaLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl shrink-0", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
