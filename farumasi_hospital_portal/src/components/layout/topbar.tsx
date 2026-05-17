"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User, Shield, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockNotifications } from "@/data/mock";

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
  breadcrumb?: string;
}

export function Topbar({ collapsed, onToggle, breadcrumb }: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unread = mockNotifications.filter((n) => !n.isRead).length;

  return (
    <header className="flex items-center h-16 px-4 gap-3 bg-farumasi-600 shrink-0 relative z-30">
      {/* Hamburger */}
      <button
        onClick={onToggle}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1 shrink-0">
          <Image src="/logo.png" alt="Farumasi" width={24} height={24} className="object-contain" />
        </div>
        {!collapsed && (
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[13px] font-bold text-white tracking-wide">FARUMASI</span>
            <span className="text-[9px] text-white/60 uppercase tracking-widest">Hospital Portal</span>
          </div>
        )}
      </Link>

      {/* Hospital name pill */}
      <div className="hidden lg:flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
        <Building2 className="w-3.5 h-3.5 text-white/70" />
        <span className="text-[11px] font-medium text-white/90 truncate max-w-[220px]">
          Kigali University Teaching Hospital
        </span>
      </div>

      {/* Breadcrumb */}
      {breadcrumb && (
        <span className="hidden md:block text-sm text-white/60 truncate">/ {breadcrumb}</span>
      )}

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 w-48 lg:w-64">
        <Search className="w-3.5 h-3.5 text-white/60 shrink-0" />
        <input
          type="text"
          placeholder="Search hospital..."
          className="flex-1 bg-transparent text-[13px] text-white placeholder:text-white/50 outline-none"
        />
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              <span className="text-xs text-white bg-farumasi-600 rounded-full px-2 py-0.5">{unread} new</span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
              {mockNotifications.slice(0, 5).map((n) => (
                <div key={n.id} className={cn("px-4 py-3 hover:bg-slate-50 cursor-pointer", !n.isRead && "bg-farumasi-50/40")}>
                  <div className="flex items-start gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", n.isRead ? "bg-slate-300" : "bg-farumasi-600")} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/notifications" onClick={() => setNotifOpen(false)} className="block text-center text-xs font-medium text-farumasi-600 hover:text-farumasi-700 py-2.5 border-t border-slate-100">
              View all notifications →
            </Link>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold">
            AM
          </div>
          <span className="hidden md:block text-[13px] font-medium text-white">Alice M.</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/60" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            <div className="px-4 py-3 bg-farumasi-50 border-b border-farumasi-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-farumasi-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Alice Mukamusoni</p>
                  <p className="text-xs text-farumasi-700">Super Hospital Admin</p>
                </div>
              </div>
            </div>
            <div className="py-1">
              {[
                { icon: User, label: "My Profile" },
                { icon: Shield, label: "Security" },
                { icon: Settings, label: "Settings" },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <Icon className="w-4 h-4 text-slate-400" />
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop for dropdowns */}
      {(profileOpen || notifOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setProfileOpen(false); setNotifOpen(false); }} />
      )}
    </header>
  );
}
