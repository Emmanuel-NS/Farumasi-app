"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mockDoctor } from "@/data/mock";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard, Users, FileText, Pill, Package,
  FilePlus, History, NotebookPen, Brain, MapPin,
  RefreshCw, TrendingUp, Bell, Building2, Send,
  BarChart3, User, Settings, Shield, ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard",             href: "/dashboard",         icon: LayoutDashboard },
      { label: "Patients",              href: "/patients",          icon: Users },
      { label: "Prescriptions",         href: "/prescriptions",     icon: FileText },
      { label: "Medicine Intel",        href: "/medicines",         icon: Pill },
      { label: "Fulfillment",           href: "/fulfillment",       icon: Package },
    ],
  },
  {
    title: "CLINICAL",
    items: [
      { label: "New Prescription",      href: "/prescriptions/new", icon: FilePlus },
      { label: "Treatment History",     href: "/treatment",         icon: History },
      { label: "Clinical Notes",        href: "/notes",             icon: NotebookPen },
    ],
  },
  {
    title: "AI & INTELLIGENCE",
    items: [
      { label: "Smart Recommendations", href: "/recommendations",   icon: Brain },
      { label: "Availability Intel",    href: "/availability",      icon: MapPin },
      { label: "Alternatives",          href: "/alternatives",      icon: RefreshCw },
      { label: "Demand & Shortages",    href: "/insights",          icon: TrendingUp },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Notifications",         href: "/notifications",     icon: Bell, badge: 3 },
      { label: "Pharmacy Network",      href: "/pharmacy",          icon: Building2 },
      { label: "Referrals",             href: "/referrals",         icon: Send },
      { label: "Analytics",             href: "/analytics",         icon: BarChart3 },
      { label: "Reports",               href: "/reports",           icon: FileText },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "My Profile",            href: "/profile",           icon: User },
      { label: "Settings",              href: "/settings",          icon: Settings },
      { label: "Security & Audit",      href: "/audit",             icon: Shield },
    ],
  },
];

interface SidebarProps { collapsed: boolean }

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-farumasi-600 transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
        {navSections.map((section) => (
          <div key={section.title} className="mb-2">
            {!collapsed && (
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest px-3 mb-1">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                        active
                          ? "bg-white/20 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 leading-none text-[13px]">{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                            <span className={cn(
                              "text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                              active ? "bg-white/25 text-white" : "bg-white/20 text-white"
                            )}>
                              {item.badge}
                            </span>
                          ) : (
                            <ChevronRight className={cn("w-4 h-4", active ? "text-white/60" : "text-white/30")} />
                          )}
                        </>
                      )}
                      {collapsed && item.badge && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Doctor info footer */}
      <div className="shrink-0 border-t border-white/10 px-2 py-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {getInitials(mockDoctor.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">Dr. {mockDoctor.name.split(" ").slice(-1)[0]}</p>
              <p className="text-xs text-white/70 truncate">{mockDoctor.specialty}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-white/70 shrink-0" title="Online" />
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{getInitials(mockDoctor.name)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

