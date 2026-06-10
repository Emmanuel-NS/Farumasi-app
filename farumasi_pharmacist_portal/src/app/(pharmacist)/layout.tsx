"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { RightPanel } from "@/components/layout/right-panel";
import { LayoutDashboard, FileText, ShoppingBag, Package, Heart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const mobileNavItems = [
  { label: "Overview",  href: "/overview",  icon: LayoutDashboard },
  { label: "Requests",  href: "/requests",  icon: FileText },
  { label: "Orders",    href: "/orders",    icon: ShoppingBag },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Health",    href: "/health",    icon: Heart },
];

const ALLOWED_ROLES = new Set(["pharmacist", "super_admin"]);

export default function PharmacistLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate, user, logout } = useAuthStore();
  const hydratedOnce = useRef(false);

  useEffect(() => {
    if (hydratedOnce.current) return;
    hydratedOnce.current = true;
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const togglePanel = (panel: string) =>
    setActivePanel((prev) => (prev === panel ? null : panel));

  if (!isLoading && !isAuthenticated) return null;

  // Wrong-portal guard: block pharmacy_admin / partner accounts
  if (user && !ALLOWED_ROLES.has(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-3xl">🏥</div>
        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-xl font-bold text-slate-900">Wrong portal</h2>
          <p className="text-sm text-slate-500">
            Your account (<span className="font-semibold text-slate-700">{user.full_name}</span>) is a{" "}
            <span className="font-semibold text-slate-700">{user.role}</span> account.
            Partner pharmacies and companies should use the <strong>Partner Portal</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { logout(); router.replace("/auth/login"); }}
            className="px-5 py-2.5 bg-farumasi-600 text-white text-sm font-semibold rounded-xl hover:bg-farumasi-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

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
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} />
          <div className="w-3 bg-farumasi-600 flex items-center justify-center">
            <div className="h-8 w-1 rounded-full bg-white/30" />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto scrollbar-hide bg-[#F6F8FB] rounded-tl-[32px] pb-16 md:pb-0">
            {children}
          </main>
          {activePanel && (
            <RightPanel activePanel={activePanel} onClose={() => setActivePanel(null)} />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around px-2 py-1.5 safe-bottom">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/overview"
              ? pathname === "/overview"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-w-0",
                isActive
                  ? "text-farumasi-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
