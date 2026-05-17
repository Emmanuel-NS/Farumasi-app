"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { mockNotifications } from "@/data/mock";
import {
  Bell, Search, Menu, ChevronDown, Settings, LogOut,
  AlertTriangle, Info, Shield, User,
} from "lucide-react";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard", users: "Users", hospitals: "Hospitals",
  doctors: "Doctors", pharmacies: "Pharmacies", pharmacists: "Pharmacists",
  suppliers: "Suppliers & Companies", riders: "Riders", departments: "Departments",
  catalogue: "Product Catalogue", "product-requests": "Product Requests",
  inventory: "Inventory Intelligence", availability: "Availability Intelligence",
  listings: "Marketplace Listings", orders: "Orders", fulfillment: "Fulfillment",
  delivery: "Delivery Operations", prescriptions: "Prescription Coordination",
  "pharmacy-coordination": "Pharmacy Coordination", revenue: "Revenue Management",
  commissions: "Commissions", withdrawals: "Withdrawals", payouts: "Payouts",
  "financial-analytics": "Financial Analytics", subscriptions: "Subscriptions",
  "ai-insights": "AI Operational Insights", forecasting: "Demand Forecasting",
  "shortage-intelligence": "Shortage Intelligence", recommendations: "Recommendation Intelligence",
  predictions: "Ecosystem Predictions", verification: "Verification Center",
  compliance: "Compliance Monitoring", audit: "Audit Logs", security: "Security Events",
  roles: "Roles & Permissions", notifications: "Notifications", integrations: "Integrations",
  "feature-flags": "Feature Flags", settings: "Platform Settings",
  "api-management": "API Management", "system-monitoring": "System Monitoring",
  ecosystem: "Ecosystem Health", intelligence: "Operational Intelligence", bi: "Business Intelligence",
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
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const unread = mockNotifications.filter((n) => !n.isRead).length;

  const notifIcon = (severity: string) => {
    switch (severity) {
      case "Critical": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case "Warning":  return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:         return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

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
      <div className="flex-1 max-w-xl mx-auto">
        <div className="flex items-center bg-white rounded-full px-4 h-10 gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search ecosystem..."
          />
        </div>
      </div>

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
                {mockNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer",
                      !notif.isRead && "bg-farumasi-50/60"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{notifIcon(notif.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-semibold", !notif.isRead && "text-farumasi-800")}>{notif.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </div>
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
              SA
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b bg-farumasi-50">
                <p className="text-xs font-semibold mt-1">Super Admin</p>
                <p className="text-[10px] text-slate-500">superadmin@farumasi.rw</p>
              </div>
              {[
                { icon: User,     label: "My Profile", href: "/settings" },
                { icon: Settings, label: "Settings",   href: "/settings" },
                { icon: Shield,   label: "Security",   href: "/security" },
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
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
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
