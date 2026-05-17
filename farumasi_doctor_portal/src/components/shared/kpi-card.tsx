"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: "green" | "blue" | "amber" | "red" | "purple" | "teal";
  className?: string;
}

const colorMap = {
  green:  { icon: "bg-farumasi-100 text-farumasi-700", bar: "bg-farumasi-600" },
  blue:   { icon: "bg-blue-100 text-blue-700",         bar: "bg-blue-500" },
  amber:  { icon: "bg-amber-100 text-amber-700",       bar: "bg-amber-500" },
  red:    { icon: "bg-red-100 text-red-700",           bar: "bg-red-500" },
  purple: { icon: "bg-purple-100 text-purple-700",     bar: "bg-purple-500" },
  teal:   { icon: "bg-teal-100 text-teal-700",         bar: "bg-teal-500" },
};

export function KpiCard({
  label,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  color = "green",
  className,
}: KpiCardProps) {
  const colors = colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-slate-500">{label}</span>
          <span className="text-3xl font-bold text-slate-900">{value}</span>
          {subtitle && <span className="text-sm text-slate-400">{subtitle}</span>}
        </div>
        {icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors.icon)}>
            {icon}
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-semibold px-1.5 py-0.5 rounded",
              isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}
          >
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && <span className="text-sm text-slate-400">{changeLabel}</span>}
        </div>
      )}
      <div className={cn("h-0.5 rounded-full opacity-30", colors.bar)} />
    </div>
  );
}
