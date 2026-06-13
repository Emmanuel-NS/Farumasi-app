"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { PresenceToggle } from "@/components/layout/presence-toggle";
import { notificationsService } from "@/lib/services/notifications.service";
import { consultationsService } from "@/lib/services/consultations.service";
import { startVisibleInterval } from "@/lib/polling";
import { Menu, Bell, MessageCircle, HelpCircle, LogOut, User, Settings } from "lucide-react";

const routeLabels: Record<string, string> = {
  overview: "Overview",
  requests: "Prescription Requests",
  orders: "Orders",
  inventory: "Inventory",
  settings: "Settings",
  notifications: "Notifications",
  chat: "Patient Chat",
  profile: "My Profile",
};

interface TopbarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNotifClick?: () => void;
  onChatClick?: () => void;
  onHelpClick?: () => void;
  activePanel?: string | null;
}

export function Topbar({ collapsed, onToggle, onNotifClick, onChatClick, onHelpClick, activePanel }: TopbarProps) {
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    let cancelled = false;
    return startVisibleInterval(() => {
      notificationsService
        .unreadCount()
        .then((n) => {
          if (!cancelled) setUnread(n);
        })
        .catch(() => {});
      consultationsService
        .unreadCount(user?.id)
        .then((n) => {
          if (!cancelled) setChatUnread(n);
        })
        .catch(() => {});
    }, 60_000);
  }, [user?.id]);

  return (
    <header className="h-[72px] bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 z-20">
      {/* Hamburger */}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors shrink-0"
        title={collapsed ? "Expand menu" : "Collapse menu"}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Logo + Brand */}
      <Link href="/overview" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <span className="text-white font-extrabold text-[16px] tracking-wide hidden sm:block">
          FARUMASI
        </span>
        <span className="hidden sm:block text-white/70 text-xs font-medium border border-white/25 rounded-full px-2 py-0.5 ml-1">
          Pharmacist
        </span>
      </Link>

      {/* Pharmacy name — desktop only */}
      <div className="hidden lg:flex items-center gap-1 ml-1">
        <span className="text-white/60 text-sm">/</span>
        <span className="text-white/80 text-sm">{user?.full_name ?? "Pharmacist"}</span>
      </div>

      <div className="flex items-center gap-0.5 ml-auto">
        {/* Presence */}
        <div className="mr-1.5">
          <PresenceToggle />
        </div>

        {/* Chat */}
        <div className="relative">
          <button
            onClick={onChatClick}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activePanel === "chat" ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
            )}
            title="Patient Chat"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {chatUnread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </div>

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
            <span className="text-sm font-bold text-[#EFFFB5]">{getInitials(user?.full_name ?? "P")}</span>
          </button>
          {showProfile && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900">{user?.full_name ?? "Pharmacist"}</p>
                <p className="text-xs text-slate-500">{user?.email ?? ""}</p>
              </div>
              <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setShowProfile(false)}>
                <User className="w-4 h-4 text-farumasi-600" />
                My Profile
              </Link>
              <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setShowProfile(false)}>
                <Settings className="w-4 h-4 text-farumasi-600" />
                Settings
              </Link>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => { logout(); window.location.href = "/auth/login"; }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
