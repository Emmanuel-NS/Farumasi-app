"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bell, Search, ChevronDown, LogOut, User, Settings,
  Building2, CheckCircle2, Menu, HelpCircle, SlidersHorizontal,
  Wallet, ArrowUpRight,
} from "lucide-react";
import { cn, formatCompactRWF, formatRWF } from "@/lib/utils";
import { mockNotifications, mockRevenueStats } from "@/data/mock";
import { toast } from "@/lib/toast";

interface TopbarProps { collapsed: boolean; onToggle: () => void }

export function Topbar({ onToggle }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [search, setSearch] = useState("");
  const unread = mockNotifications.filter(n => !n.isRead);

  return (
    <header className="h-16 bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 sticky top-0 z-20">
      {/* Hamburger toggle */}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo + brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <span className="text-white font-bold text-lg tracking-wide hidden sm:block">Farumasi</span>
      </Link>

      {/* Search bar */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="flex items-center bg-white rounded-full px-4 h-10 gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search products, orders, pharmacies…"
          />
          <button className="p-1 text-slate-400 hover:text-farumasi-600 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Wallet / Balance */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setShowWallet(!showWallet); setShowNotifications(false); setShowProfile(false); }}
          className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white border border-white/20"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold hidden sm:block">{formatCompactRWF(mockRevenueStats.availableBalance)}</span>
        </button>
        {showWallet && (
          <div className="absolute right-0 top-12 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 bg-farumasi-600 text-white">
              <p className="text-[10px] font-medium opacity-70">Available Balance</p>
              <p className="text-2xl font-bold mt-0.5">{formatRWF(mockRevenueStats.availableBalance)}</p>
              <p className="text-[10px] opacity-60 mt-1">Pending: {formatRWF(mockRevenueStats.pendingBalance)}</p>
            </div>
            <div className="p-3 space-y-2">
              <button
                onClick={() => { toast.success("Withdrawal request submitted. Funds arrive within 24 hours."); setShowWallet(false); }}
                className="w-full flex items-center justify-center gap-1.5 h-8 bg-farumasi-600 text-white text-xs font-semibold rounded-lg hover:bg-farumasi-700 transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw Funds
              </button>
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

      {/* Right action icons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Help */}
        <button className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowWallet(false); }}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unread.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-farumasi-600" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs text-farumasi-600 font-medium">{unread.length} unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer",
                      !n.isRead && "bg-farumasi-50/60"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", !n.isRead ? "bg-farumasi-500" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", !n.isRead && "text-farumasi-800")}>{n.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/notifications"
                className="flex items-center justify-center py-3 text-xs font-medium text-farumasi-600 hover:bg-slate-50 transition-colors"
                onClick={() => setShowNotifications(false)}
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowWallet(false); }}
            className="flex items-center gap-1.5 rounded-full px-1.5 py-1 text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center text-white text-sm font-bold">
              KD
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b bg-farumasi-50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-farumasi-600" />
                  <span className="text-[10px] font-medium text-farumasi-700">Verified Partner</span>
                </div>
                <p className="text-xs font-semibold mt-1">Inyange Pharmacy Ltd</p>
                <p className="text-[10px] text-slate-500">admin@inyangepharma.rw</p>
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
                <button className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {(showNotifications || showProfile || showWallet) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifications(false); setShowProfile(false); setShowWallet(false); }}
        />
      )}
    </header>
  );
}
