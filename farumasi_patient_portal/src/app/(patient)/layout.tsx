"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightPanel } from "@/components/layout/right-panel";
import { Store, HeartPulse, MessageCircle, ShoppingBag, FileText } from "lucide-react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const togglePanel = (panel: string) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600">
      <Topbar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onNotifClick={() => togglePanel("notifications")}
        onCartClick={() => togglePanel("cart")}
        onHelpClick={() => togglePanel("help")}
        activePanel={activePanel}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar — desktop only (sm = 640px, closest to Flutter's 600px) */}
        <div className="hidden sm:flex">
          <Sidebar collapsed={collapsed} />
          {/* Resize handle (visual, matches Flutter drag handle) */}
          <div className="w-3.5 bg-farumasi-600 flex items-center justify-center cursor-col-resize shrink-0">
            <div className="h-9 w-1 rounded-full bg-white/30 flex flex-col justify-evenly items-center gap-1">
              <span className="block w-0.5 h-0.5 rounded-full bg-white" />
              <span className="block w-0.5 h-0.5 rounded-full bg-white" />
              <span className="block w-0.5 h-0.5 rounded-full bg-white" />
            </div>
          </div>
        </div>

        {/* Main content + optional right panel */}
        <div className={cn(
          "flex flex-1 min-w-0 overflow-hidden",
          activePanel ? "gap-3" : ""
        )}>
          <main
            className={cn(
              "flex-1 overflow-y-auto scrollbar-hide bg-[#F6F8FB]",
              "rounded-tl-[32px]",
              activePanel ? "rounded-tr-[24px]" : ""
            )}
          >
            {children}
          </main>

          {/* Right panel — floats with left gap, both top corners rounded (mirrors Flutter) */}
          {activePanel && (
            <RightPanel activePanel={activePanel} onClose={() => setActivePanel(null)} />
          )}
        </div>
      </div>

      {/* Mobile bottom nav — hidden above sm (640px ≈ Flutter's 600px isWideScreen) */}
      <nav className="sm:hidden flex items-center justify-around bg-farumasi-600 shrink-0 px-2 h-[60px]">
        <MobileNavItem href="/store"         label="Home"      Icon={Store} />
        <MobileNavItem href="/health"        label="Health"    Icon={HeartPulse} />
        <MobileNavItem href="/prescriptions" label="Upload Rx" Icon={FileText} primary />
        <MobileNavItem href="/consult"       label="Consult"   Icon={MessageCircle} />
        <MobileNavItem href="/orders"        label="Orders"    Icon={ShoppingBag} />
      </nav>
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  Icon,
  primary,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  primary?: boolean;
}) {
  const pathname = usePathname();
  const isActive = href === "/store"
    ? pathname === "/store" || pathname.startsWith("/store/")
    : pathname === href || pathname.startsWith(href + "/");

  if (primary) {
    return (
      <Link
        href={href}
        className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-white shadow-md -mt-4 border-[3px] border-farumasi-600"
      >
        <Icon className="w-6 h-6 text-farumasi-600" />
        <span className="text-[9px] font-bold text-farumasi-700 mt-0.5 leading-none">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 px-2 py-1 transition-colors",
        isActive ? "text-white" : "text-white/70 hover:text-white"
      )}
    >
      <Icon className={cn("w-7 h-7", isActive && "drop-shadow-sm")} />
      <span className={cn("text-[11px]", isActive ? "font-bold" : "font-normal")}>{label}</span>
    </Link>
  );
}

