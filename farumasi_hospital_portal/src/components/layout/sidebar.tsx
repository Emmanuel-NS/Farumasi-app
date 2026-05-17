"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, UserCheck, Building2, Users, ClipboardList,
  Pill, Package, Store, GitBranch, Activity,
  UserCog, Shield, BadgeCheck, ScrollText, BarChart3,
  TrendingUp, Brain, HeartPulse, Bell, Plug, Settings, Lock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}
interface NavSection {
  section: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    section: "MAIN",
    items: [
      { label: "Executive Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Doctors", href: "/doctors", icon: UserCheck },
      { label: "Departments", href: "/departments", icon: Building2 },
      { label: "Patients Overview", href: "/patients", icon: Users },
      { label: "Prescriptions", href: "/prescriptions", icon: ClipboardList },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { label: "Medicine Intelligence", href: "/medicines", icon: Pill },
      { label: "Fulfillment Tracking", href: "/fulfillment", icon: Package },
      { label: "Pharmacy Coordination", href: "/pharmacy", icon: Store },
      { label: "Referrals", href: "/referrals", icon: GitBranch },
      { label: "Clinical Operations", href: "/operations", icon: Activity },
    ],
  },
  {
    section: "ADMINISTRATION",
    items: [
      { label: "Staff Management", href: "/staff", icon: UserCog },
      { label: "Permissions & Roles", href: "/roles", icon: Shield },
      { label: "Compliance", href: "/compliance", icon: BadgeCheck },
      { label: "Audit Logs", href: "/audit", icon: ScrollText },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { label: "Hospital Analytics", href: "/analytics", icon: TrendingUp },
      { label: "Operational Insights", href: "/insights", icon: Brain },
      { label: "Insurance Insights", href: "/insurance", icon: HeartPulse },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Security", href: "/security", icon: Lock },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-farumasi-600 transition-all duration-300 overflow-hidden shrink-0",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {navSections.map((section) => (
          <div key={section.section}>
            {/* Section label */}
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-widest text-white/50 uppercase px-4 pt-4 pb-1.5 select-none">
                {section.section}
              </p>
            )}
            {collapsed && <div className="h-3" />}

            {section.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 mx-2 px-2.5 py-2 rounded-lg transition-all duration-150 group",
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "shrink-0 transition-colors",
                      collapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                      active ? "text-white" : "text-white/70 group-hover:text-white"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="text-[13px] font-medium truncate flex-1">{item.label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-white/60 shrink-0" />}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("p-2 border-t border-white/15", collapsed ? "flex justify-center" : "")}>
        {collapsed ? (
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold">
            AM
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/10">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              AM
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">Alice Mukamusoni</p>
              <p className="text-[11px] text-white/60 truncate">Super Hospital Admin</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
