"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      {/* Topbar spans full width */}
      <Topbar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 rounded-tl-2xl">
          <div className="p-6 min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
