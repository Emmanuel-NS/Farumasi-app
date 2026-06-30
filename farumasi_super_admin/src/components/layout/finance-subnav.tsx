"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, DollarSign, ArrowDownToLine, Banknote } from "lucide-react";

const TABS = [
  { href: "/finance", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/finance/payments", label: "Payments", icon: Banknote },
  { href: "/finance/revenue", label: "Revenue", icon: DollarSign },
  { href: "/finance/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
];

export function FinanceSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 mb-1">
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors",
              active
                ? "bg-farumasi-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-farumasi-300 hover:text-farumasi-700",
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
