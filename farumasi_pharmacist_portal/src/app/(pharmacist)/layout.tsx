"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightPanel } from "@/components/layout/right-panel";

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const togglePanel = (panel: string) =>
    setActivePanel((prev) => (prev === panel ? null : panel));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <Topbar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onNotifClick={() => togglePanel("notifications")}
        onChatClick={() => togglePanel("chat")}
        onHelpClick={() => togglePanel("help")}
        activePanel={activePanel}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} />
          <div className="w-3 bg-farumasi-600 flex items-center justify-center">
            <div className="h-8 w-1 rounded-full bg-white/30" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-hide bg-[#F6F8FB] rounded-tl-[32px]">
            {children}
          </main>
          {activePanel && (
            <RightPanel activePanel={activePanel} onClose={() => setActivePanel(null)} />
          )}
        </div>
      </div>
    </div>
  );
}
