"use client";

import { FinanceSubNav } from "@/components/layout/finance-subnav";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <FinanceSubNav />
      {children}
    </div>
  );
}
