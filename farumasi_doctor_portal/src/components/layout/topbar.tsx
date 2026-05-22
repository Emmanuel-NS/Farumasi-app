"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { cn, getInitials, timeAgo } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  Bell, ChevronDown, LogOut, Settings, User,
  Search, FilePlus, AlertTriangle, Info, Shield, Menu,
  CheckCircle2, SlidersHorizontal,
} from "lucide-react";

// Breadcrumb route labels
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  prescriptions: "Prescriptions",
  new: "New Prescription",
  medicines: "Medicine Intelligence",
  fulfillment: "Fulfillment Tracking",
  notes: "Clinical Notes",
  treatment: "Treatment History",
  recommendations: "Smart Recommendations",
  availability: "Availability Intelligence",
  alternatives: "Alternative Medicines",
  insights: "Demand & Shortages",
  notifications: "Notifications",
  pharmacy: "Pharmacy Network",
  referrals: "Referrals",
  analytics: "Analytics",
  reports: "Reports",
  profile: "My Profile",
  settings: "Settings",
  audit: "Security & Audit",
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

interface TopbarProps { collapsed: boolean; onToggle: () => void }

export function Topbar({ onToggle }: TopbarProps) {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const { user, logout } = useAuthStore();
  const unread = 0;

  const notifIcon = (severity: string) => {
    switch (severity) {
      case "Critical": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case "Warning":  return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:         return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

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

      {/* Breadcrumb */}
      <div className="flex-none hidden md:block px-2">
        <Breadcrumb />
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="flex items-center bg-white rounded-full px-4 h-10 gap-2 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-slate-400 text-slate-700"
            placeholder="Search patients, medicines, prescriptions…"
          />
          <button className="p-1 text-slate-400 hover:text-farumasi-600 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right action icons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* New Rx quick action */}
        <Link
          href="/prescriptions/new"
          className="flex items-center gap-1.5 text-sm font-semibold bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 h-9 rounded-full transition-colors hidden sm:flex"
        >
          <FilePlus className="w-3.5 h-3.5" />
          New Rx
        </Link>

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
                <div className="py-8 text-center text-xs text-slate-400">No new notifications</div>
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
              {getInitials(user?.full_name ?? "Dr")}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/70 hidden sm:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b bg-farumasi-50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-farumasi-600" />
                  <span className="text-[10px] font-medium text-farumasi-700">Verified Doctor</span>
                </div>
                <p className="text-xs font-semibold mt-1">Dr. {user?.full_name ?? "Doctor"}</p>
                <p className="text-[10px] text-slate-500">{user?.email ?? ""}</p>
              </div>
              {[
                { icon: User,     label: "My Profile",       href: "/profile" },
                { icon: Settings, label: "Settings",         href: "/settings" },
                { icon: Shield,   label: "Security & Audit", href: "/audit" },
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
                <button
                  onClick={() => { setShowProfile(false); logout?.(); toast.success("Signed out successfully"); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {(showNotif || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotif(false); setShowProfile(false); }}
        />
      )}
    </header>
  );
}

