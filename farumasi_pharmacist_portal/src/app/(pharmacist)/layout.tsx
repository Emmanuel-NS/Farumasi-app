"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const togglePanel = (panel: string) =>
    setActivePanel((prev) => (prev === panel ? null : panel));

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-farumasi-600 animate-pulse">
        {/* Topbar skeleton */}
        <div className="h-14 shrink-0 flex items-center justify-between px-4 bg-farumasi-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20" />
            <div className="hidden md:block h-4 w-28 rounded bg-white/20" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <div className="w-8 h-8 rounded-full bg-white/20" />
            <div className="w-8 h-8 rounded-full bg-white/20" />
          </div>
        </div>
        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar skeleton */}
          <div className="hidden md:flex flex-col w-56 shrink-0 bg-farumasi-700/40 p-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                <div className="w-5 h-5 rounded bg-white/20 shrink-0" />
                <div className="h-3 rounded bg-white/20 flex-1" />
              </div>
            ))}
          </div>
          <div className="w-3 bg-farumasi-600 hidden md:block" />
          {/* Content skeleton */}
          <div className="flex-1 bg-[#F6F8FB] rounded-tl-[32px] p-6 space-y-6 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="h-5 w-36 rounded bg-slate-200" />
                <div className="h-3 w-52 rounded bg-slate-200" />
              </div>
              <div className="h-8 w-24 rounded-lg bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
                  <div className="h-3 w-20 rounded bg-slate-200" />
                  <div className="h-7 w-16 rounded bg-slate-200" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b"><div className="h-4 w-32 rounded bg-slate-200" /></div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                  <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-40 rounded bg-slate-200" />
                    <div className="h-3 w-24 rounded bg-slate-200" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

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
