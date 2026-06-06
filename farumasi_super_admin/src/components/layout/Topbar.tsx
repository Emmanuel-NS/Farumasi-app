"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { openNotification } from "@/lib/notification-links";
import {
  Bell, Search, Menu, ChevronDown, Settings, LogOut,
  AlertTriangle, Info, User,
} from "lucide-react";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Users",
  patients: "Patients",
  pharmacists: "Pharmacists",
  riders: "Riders",
  pharmacies: "Pharmacies & Companies",
  orders: "Orders",
  prescriptions: "Prescriptions",
  finance: "Finance Hub",
  revenue: "Revenue",
  withdrawals: "Withdrawals",
  audit: "Audit & Compliance",
  settings: "Settings",
  notifications: "Notifications",
  security: "Security",
};

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {segments.map((seg, i) => (
        <span key={seg} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-white/30">/</span>}
          <span className={cn(
            i === segments.length - 1 ? "text-white font-medium" : "text-white/50"
          )}>
            {routeLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Topbar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message?: string | null;
    category?: string | null;
    read_status: boolean;
    action_url?: string | null;
    created_at: string;
  }>>([]);

  const initials =
    user?.full_name
      ?.split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "SA";

  function handleSignOut() {
    logout();
    setShowProfile(false);
    router.replace("/login");
  }

  useEffect(() => {
    type NotifItem = {
      id: string;
      title: string;
      message?: string | null;
      category?: string | null;
      read_status: boolean;
      action_url?: string | null;
      created_at: string;
    };
    api.get<{ items: NotifItem[] } | NotifItem[]>("/notifications/", { params: { limit: 20 } })
      .then(r => {
        const data = r.data;
        setNotifications(Array.isArray(data) ? data : (data as { items: NotifItem[] }).items ?? []);
      })
      .catch(() => setNotifications([]));
  }, []);

  const unread = notifications.filter((n) => !n.read_status).length;

  async function handleNotifClick(notif: (typeof notifications)[number]) {
    await openNotification(
      notif,
      router,
      async (id) => {
        await api.patch(`/notifications/${id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_status: true } : n)),
        );
      },
    );
    setShowNotif(false);
  }

  const notifIcon = (category?: string | null) => {
    switch (category) {
      case "withdrawal":
      case "alert":
      case "critical":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (/^frm-/i.test(q) || q.includes("-")) {
      router.push(`/orders?q=${encodeURIComponent(q)}`);
    } else if (q.includes("@")) {
      router.push(`/users/patients?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/pharmacies?q=${encodeURIComponent(q)}`);
    }
    setSearch("");
  }

  return (
    <header className="h-16 bg-farumasi-600 flex items-center gap-3 px-4 shrink-0 z-20">
      {/* Hamburger */}
      <button
        onClick={onToggle}
        className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo + brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <Image src="/logo.png" alt="FARUMASI" width={28} height={28} className="object-contain" />
        </div>
        <div className="hidden sm:block">
          <p className="text-white font-bold text-[15px] leading-none tracking-wide">FARUMASI</p>
          <p className="text-white/60 text-[10px] font-medium leading-none mt-0.5 uppercase tracking-wider">Super Admin</p>
        </div>
      </Link>

      {/* Breadcrumb */}
      <div className="hidden md:block px-2">
        <Breadcrumb />
      </div>

      {/* Search */}
      <form className="flex-1 max-w-xl mx-auto" onSubmit={handleSearchSubmit}>
        <div className="flex items-center bg-white rounded-full px-4 h-10 gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search orders, pharmacies, users…"
          />
        </div>
      </form>

      {/* Right controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
            className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full ring-2 ring-farumasi-600" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && <span className="text-xs text-farumasi-600 font-medium">{unread} unread</span>}
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-hide">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No notifications.</p>
                ) : notifications.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => void handleNotifClick(notif)}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer w-full text-left",
                      !notif.read_status && "bg-farumasi-50/60"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(notif.category)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", !notif.read_status && "text-farumasi-800")}>{notif.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.message ?? ""}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.created_at)}</p>
                      {notif.action_url && (
                        <p className="text-[10px] text-farumasi-600 font-medium mt-0.5">Tap to open →</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <Link
                href="/notifications"
                onClick={() => setShowNotif(false)}
                className="flex items-center justify-center py-3 text-xs font-medium text-farumasi-600 hover:bg-slate-50 transition-colors"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
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
                <p className="text-xs font-semibold mt-1">{user?.full_name ?? "Super Admin"}</p>
                <p className="text-[10px] text-slate-500">{user?.email ?? "—"}</p>
              </div>
              {[
                { icon: User, label: "My Profile", href: "/settings" },
                { icon: Settings, label: "Settings", href: "/settings" },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {label}
                </Link>
              ))}
              <div className="border-t">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
