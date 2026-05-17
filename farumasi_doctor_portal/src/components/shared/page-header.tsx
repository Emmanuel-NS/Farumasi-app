import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-farumasi-100 flex items-center justify-center text-farumasi-700 flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="text-base text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
