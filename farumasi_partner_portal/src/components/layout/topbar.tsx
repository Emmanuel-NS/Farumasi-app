"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Bell, Search, ChevronDown, LogOut, User, Settings,
  Building2, Menu, HelpCircle, SlidersHorizontal,
  Wallet, ArrowUpRight,
} from "lucide-react";
import { cn, formatCompactRWF, formatRWF, timeAgo } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/lib/store/auth";
import { useLayoutDataStore } from "@/lib/store/layout-data";
import { openNotification } from "@/lib/notification-links";
import { notificationsService } from "@/lib/services/notifications.service";

interface TopbarProps { collapsed: boolean; onToggle: () => void }

export function Topbar({ onToggle }: TopbarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [search, setSearch] = useState("");

  // All live data comes from the single shared store polled in the layout
  const unreadCount = useLayoutDataStore(s => s.unreadCount);
  const notifications = useLayoutDataStore(s => s.recentNotifications);
  const availableBalance = useLayoutDataStore(s => s.availableBalance);
  const pendingBalance = useLayoutDataStore(s => s.pendingBalance);
  const sellerName = useLayoutDataStore(s => s.sellerName);

  const handleSignout = () => {
    logout();
    toast.success("Signed out");
    router.replace("/login");
  };

  const initials = (user?.full_name || "P")
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    const orderLike = /^frm-/i.test(q) || q.length >= 8;
    router.push(
      orderLike
        ? `/orders?q=${encodeURIComponent(q)}`
        : `/products/listed?q=${encodeURIComponent(q)}`,
    );
    setSearch("");
  };

  return (
    <header className="h-16 bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 sticky top-0 z-20">
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 min-w-0 max-w-[min(42vw,320px)]">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          <span className="text-white font-bold text-lg tracking-wide shrink-0">FARUMASI</span>
          {sellerName && (
            <>
              <span className="text-white/45 text-sm shrink-0">/</span>
              <span
                className="text-white/90 text-sm font-semibold truncate"
                title={sellerName}
              >
                {sellerName}
              </span>
            </>
          )}
        </div>
      </Link>

      <form className="flex-1 max-w-xl mx-auto" onSubmit={handleSearchSubmit}>
        <div className="flex items-center bg-white rounded-full px-4 h-10 gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search products, orders, pharmacies…"
          />
          <button type="button" className="p-1 text-slate-400 hover:text-farumasi-600 transition-colors" title="Search only">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="relative shrink-0">
        <button
          onClick={() => { setShowWallet(!showWallet); setShowNotifications(false); setShowProfile(false); }}
          className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white border border-white/20"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold hidden sm:block tabular-nums">{formatRWF(availableBalance)}</span>
        </button>
        {showWallet && (
          <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 bg-farumasi-600 text-white">
              <p className="text-[10px] font-medium opacity-70">Available Balance</p>
              <p className="text-2xl font-bold mt-0.5">{formatRWF(availableBalance)}</p>
              <p className="text-[10px] opacity-60 mt-1">Pending: {formatRWF(pendingBalance)}</p>
            </div>
            <div className="p-3 space-y-2">
              <Link
                href="/revenue"
                onClick={() => setShowWallet(false)}
                className="w-full flex items-center justify-center gap-1.5 h-8 bg-farumasi-600 text-white text-xs font-semibold rounded-lg hover:bg-farumasi-700 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw Funds
              </Link>
              <Link
                href="/revenue"
                onClick={() => setShowWallet(false)}
                className="flex items-center justify-center text-xs text-farumasi-600 hover:underline py-1"
              >
                View Revenue Details &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors" onClick={() => router.push("/support")} title="Help & Support">
          <HelpCircle className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowWallet(false); }}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-farumasi-600" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs text-farumasi-600 font-medium">{unreadCount} unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">No notifications</div>
                )}
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      void openNotification(n, router, (id) => notificationsService.markRead(id)).then(() => {
                        void useLayoutDataStore.getState().fetch();
                        setShowNotifications(false);
                      });
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer w-full text-left",
                      !n.read_status && "bg-farumasi-50/60"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", !n.read_status ? "bg-farumasi-500" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", !n.read_status && "text-farumasi-800")}>{n.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                      {n.action_url && (
                        <p className="text-[10px] text-farumasi-600 font-medium mt-0.5">Tap to open →</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="w-full py-3 text-xs font-medium text-farumasi-600 hover:bg-slate-50 transition-colors"
                  onClick={async () => {
                    const { notificationsService } = await import("@/lib/services/notifications.service");
                    await notificationsService.markAllRead();
                    void useLayoutDataStore.getState().fetch();
                    setShowNotifications(false);
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}
        </div>

        <div className="relative ml-1">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowWallet(false); }}
            className="flex items-center gap-1.5 rounded-full px-1.5 py-1 text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b bg-farumasi-50">
                <p className="text-xs font-semibold mt-1">{user?.full_name || "Partner User"}</p>
                {sellerName && (
                  <p className="text-[10px] font-medium text-farumasi-700 truncate mt-0.5" title={sellerName}>
                    {sellerName}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">{user?.email || ""}</p>
              </div>
              {[
                { icon: User, label: "My Profile", href: "/settings" },
                { icon: Building2, label: "Business Profile", href: "/settings" },
                { icon: Settings, label: "Settings", href: "/settings" },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setShowProfile(false)}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  {label}
                </Link>
              ))}
              <div className="border-t">
                <button onClick={handleSignout} className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(showNotifications || showProfile || showWallet) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowProfile(false); setShowWallet(false); }}
        />
      )}
    </header>
  );
}
