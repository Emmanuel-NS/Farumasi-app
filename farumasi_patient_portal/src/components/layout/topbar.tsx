"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { useSearchStore } from "@/store/search-store";
import { useCartLineCount } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslation } from "@/lib/translations";
import {
  Menu, Bell, ShoppingCart, HelpCircle,
  Search, LogOut, LogIn, User, Settings, X,
} from "lucide-react";
import { StoreFilterButton } from "@/components/store/store-filter-button";
import { useStoreFilterStore, storeActiveFilterCount } from "@/store/store-filter-store";

import { notificationsService } from "@/lib/services/notifications.service";
import { startVisibleInterval } from "@/lib/polling";

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
  mobileNavOpen?: boolean;
  onToggle: () => void;
  onNotifClick?: () => void;
  onCartClick?: () => void;
  onHelpClick?: () => void;
  activePanel?: string | null;
}

export function Topbar({
  collapsed,
  mobileNavOpen = false,
  onToggle,
  onNotifClick,
  onCartClick,
  onHelpClick,
  activePanel,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery, clear } = useSearchStore();
  const clearStoreFilters = useStoreFilterStore((s) => s.clearAll);
  const isStorePage = pathname === "/store";
  const storeFilterCount = storeActiveFilterCount(query);
  const cartItemCount = useCartLineCount();
  const [showProfile, setShowProfile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    return startVisibleInterval(() => {
      notificationsService.getUnreadCount().then(setUnread).catch(() => {});
    }, 60_000);
  }, []);
  const t = useTranslation();
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    setShowProfile(false);
    logout();
    router.push("/store");
  };

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
    <header
      className={cn(
        "h-[72px] bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 sticky top-0 z-[60]",
        mobileNavOpen && "z-[100]",
      )}
    >
      {/* Hamburger */}
      <button
        type="button"
        onClick={onToggle}
        className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors shrink-0"
        title={mobileNavOpen ? "Close menu" : collapsed ? "Expand menu" : "Collapse menu"}
        aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileNavOpen}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Logo + Brand */}
      <Link href="/store" className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-white font-extrabold text-[15px] sm:text-[16px] tracking-wide truncate">
            FARUMASI
          </span>
          <span className="text-white/60 text-[9px] font-medium tracking-[0.12em] uppercase hidden sm:block">
            Digital Pharmacy
          </span>
        </div>
      </Link>

      {/* Spacer */}
      <div className="flex-1 hidden sm:block" />

      {/* Search bar — filter inside whenever the bar is visible (sm+) */}
      <div className="flex-[3] max-w-[500px] lg:max-w-[620px] hidden sm:block">
        <div className="flex items-center bg-white rounded-[14px] h-12 px-3 lg:px-4 gap-2 shadow-[0_2px_4px_rgba(0,0,0,0.12)] hover:shadow-md transition-shadow">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines, symptoms, categories..."
            className="flex-1 min-w-0 text-sm text-[#0F172A] placeholder:text-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="text-slate-400 hover:text-slate-600 shrink-0"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {isStorePage && (
            <>
              <div className="w-px h-7 bg-slate-200 shrink-0" aria-hidden />
              <StoreFilterButton embedded />
              {storeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => clearStoreFilters()}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 transition-colors"
                  aria-label="Clear all filters"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 hidden sm:block" />

      <div className="flex items-center gap-0.5 ml-auto sm:ml-0 shrink-0 min-w-0">
        {/* Narrow topbar: search icon then filter (full bar hidden below sm) */}
        <button
          type="button"
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors sm:hidden"
          onClick={() => setMobileSearchOpen(true)}
          title="Search"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
        {isStorePage && <StoreFilterButton iconOnly className="sm:hidden" />}

        {/* Help — desktop only; mobile users open /help from nav */}
        <button
          onClick={onHelpClick}
          className={cn(
            "hidden sm:block p-2 rounded-lg transition-colors",
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
          {isGuest ? (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <LogIn className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white hidden sm:inline">Sign In</span>
            </Link>
          ) : (
            <>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-9 h-9 rounded-full bg-[#2B7C5E] border-2 border-white/40 flex items-center justify-center hover:bg-[#1e6b50] transition-colors"
              >
                <span className="text-sm font-bold text-[#EFFFB5]">{getInitials(user?.name ?? "Me")}</span>
              </button>
              {showProfile && (
                <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[70] animate-fade-in">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{user?.name ?? "My Account"}</p>
                    <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
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
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="absolute top-full left-0 right-0 bg-farumasi-600 px-4 py-3 flex items-center gap-2 z-30 border-t border-white/10 sm:hidden">
          <Search className="w-4 h-4 text-white/60 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines…"
            className="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/50 outline-none text-sm"
          />
          <button
            type="button"
            onClick={() => {
              clear();
              setMobileSearchOpen(false);
            }}
            className="text-white/60 hover:text-white shrink-0"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
