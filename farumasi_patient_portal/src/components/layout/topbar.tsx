"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mockUser, mockNotifications } from "@/data/mock";
import { getInitials } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
import { useCartStore } from "@/store/cart-store";
import { useTranslation } from "@/lib/translations";
import {
  Menu, Bell, ShoppingCart, HelpCircle,
  Search, LogOut, User, Settings, X,
} from "lucide-react";

const notifCategoryColor: Record<string, string> = {
  order: "text-farumasi-600",
  order_shipped: "text-indigo-600",
  health_tip: "text-farumasi-600",
  promo: "text-purple-600",
  reminder: "text-amber-600",
  general: "text-slate-400",
};

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNotifClick?: () => void;
  onCartClick?: () => void;
  onHelpClick?: () => void;
  activePanel?: string | null;
}

export function Topbar({ collapsed, onToggle, onNotifClick, onCartClick, onHelpClick, activePanel }: TopbarProps) {
  const pathname = usePathname();
  const { query, setQuery, clear } = useSearchStore();
  const cartItemCount = Object.values(useCartStore((s) => s.items)).reduce((acc, e) => acc + e.qty, 0);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const unread = mockNotifications.filter((n) => !n.isRead).length;
  const t = useTranslation();

  const routeLabels: Record<string, string> = {
    store:         t.nav_store,
    health:        t.nav_health,
    consult:       t.nav_consult,
    orders:        t.nav_orders,
    prescriptions: t.nav_prescriptions,
    settings:      t.nav_settings,
    notifications: t.nav_notifications,
    cart:          t.nav_cart,
    profile:       t.nav_profile,
    help:          t.nav_help,
  };

  const segments = pathname.split("/").filter(Boolean);
  const currentLabel = segments.map((s) => routeLabels[s] ?? (s.charAt(0).toUpperCase() + s.slice(1))).join(" / ");

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-[72px] bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 sticky top-0 z-20">
      {/* Hamburger */}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors shrink-0"
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Logo + Brand */}
      <Link href="/store" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-white font-extrabold text-[16px] tracking-wide">
            FARUMASI
          </span>
          <span className="text-white/60 text-[9px] font-medium tracking-[0.12em] uppercase hidden sm:block">
            Digital Pharmacy
          </span>
        </div>
      </Link>

      {/* Spacer */}
      <div className="flex-1 hidden sm:block" />

      {/* Search — white rounded rectangle, max 500px, matches Flutter — drives store search via Zustand */}
      <div className="flex-[3] max-w-[500px] hidden sm:block">
        <div className="flex items-center bg-white rounded-[14px] h-12 px-4 gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-md transition-shadow">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines, symptoms, categories..."
            className="flex-1 text-sm text-[#0F172A] placeholder:text-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={clear} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 hidden sm:block" />

      <div className="flex items-center gap-0.5 ml-auto sm:ml-0">
        {/* Mobile search — shown below sm */}
        <button
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors sm:hidden"
          onClick={() => setQuery(query ? "" : " ")}
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Help */}
        <button
          onClick={onHelpClick}
          className={cn(
            "p-2 rounded-lg transition-colors",
            activePanel === "help" ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
          )}
          title="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Cart */}
        <button
          onClick={onCartClick}
          className={cn(
            "relative p-2 rounded-lg transition-colors",
            activePanel === "cart" ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
          )}
          title="Cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartItemCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] bg-amber-400 text-[10px] font-extrabold text-white rounded-full flex items-center justify-center px-1 leading-none">
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </span>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={onNotifClick}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activePanel === "notifications" ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
            )}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
              {unread}
            </span>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative ml-2">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="w-9 h-9 rounded-full bg-[#2B7C5E] border-2 border-white/40 flex items-center justify-center hover:bg-[#1e6b50] transition-colors"
          >
            <span className="text-sm font-bold text-[#EFFFB5]">{getInitials(mockUser.name)}</span>
          </button>
          {showProfile && (
            <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{mockUser.name}</p>
                <p className="text-xs text-slate-500">{mockUser.email}</p>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setShowProfile(false)}
              >
                <User className="w-4 h-4 text-farumasi-600" />
                My Profile
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setShowProfile(false)}
              >
                <Settings className="w-4 h-4 text-farumasi-600" />
                Settings
              </Link>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => setShowProfile(false)}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay — shown when query is active on narrow screens */}
      {query && (
        <div className="absolute top-full left-0 right-0 bg-farumasi-600 px-4 py-3 flex items-center gap-2 z-30 border-t border-white/10 sm:hidden">
          <Search className="w-4 h-4 text-white/60" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines…"
            className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
          />
          <button onClick={clear} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
