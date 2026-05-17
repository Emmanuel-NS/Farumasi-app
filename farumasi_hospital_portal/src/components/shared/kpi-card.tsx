import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: number; // positive = up, negative = down
  icon?: React.ElementType;
  iconColor?: string;
  accent?: string;
  className?: string;
}

export function KpiCard({ label, value, subtitle, change, icon: Icon, iconColor = "text-farumasi-600", accent, className }: KpiCardProps) {
  return (
    <div className={cn("bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500 leading-tight">{label}</p>
        {Icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", accent ?? "bg-farumasi-50")}>
            <Icon className={cn("w-5 h-5", iconColor)} />
          </div>
        )}
      </div>

      <div>
        <p className="text-3xl font-bold text-slate-900 leading-none">{value}</p>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>

      {change !== undefined && (
        <div className={cn("flex items-center gap-1 text-sm font-semibold", change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-slate-400")}>
          {change > 0 ? <TrendingUp className="w-4 h-4" /> : change < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          <span>{change > 0 ? "+" : ""}{change}% vs last week</span>
        </div>
      )}
    </div>
  );
}
