"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <Topbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50 rounded-tl-2xl">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
