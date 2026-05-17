import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "green" | "blue" | "orange" | "purple" | "red";
}

const colorMap = {
  green: { bg: "bg-farumasi-50", icon: "bg-farumasi-100 text-farumasi-600", trend: "text-farumasi-600" },
  blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600", trend: "text-blue-600" },
  orange: { bg: "bg-orange-50", icon: "bg-orange-100 text-orange-600", trend: "text-orange-600" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", trend: "text-purple-600" },
  red: { bg: "bg-red-50", icon: "bg-red-100 text-red-600", trend: "text-red-600" },
};

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = "green" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn("rounded-2xl p-5 flex items-center gap-4 border border-slate-100 shadow-sm bg-white")}>
      <div className={cn("rounded-xl p-3 shrink-0", c.icon)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {trend && (
          <p className={cn("text-xs font-medium mt-0.5", trendUp ? "text-farumasi-600" : "text-red-500")}>
            {trendUp ? "↑" : "↓"} {trend}
          </p>
        )}
      </div>
    </div>
  );
}
