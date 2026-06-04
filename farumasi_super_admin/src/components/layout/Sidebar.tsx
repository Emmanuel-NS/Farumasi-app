"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users, ShoppingBag, Truck,
  Package, ClipboardList, Store,
  ShoppingCart, FileText,
  DollarSign, ArrowDownToLine,
  Settings,
  ChevronDown, ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: number | string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** CIP MVP navigation — API-backed routes only. */
const NAV: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "PLATFORM",
    items: [
      { label: "Users", href: "/users", icon: Users },
      { label: "Pharmacies", href: "/pharmacies", icon: ShoppingBag },
      { label: "Partners & Companies", href: "/suppliers", icon: Truck },
    ],
  },
  {
    title: "MARKETPLACE",
    items: [
      { label: "Product Catalogue", href: "/catalogue", icon: Package },
      { label: "Product Requests", href: "/product-requests", icon: ClipboardList },
      { label: "Listings", href: "/listings", icon: Store },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Orders", href: "/orders", icon: ShoppingCart },
      { label: "Prescriptions", href: "/prescriptions", icon: FileText },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Revenue", href: "/revenue", icon: DollarSign },
      { label: "Withdrawals", href: "/withdrawals", icon: ArrowDownToLine },
    ],
  },
  {
    title: "COMPLIANCE",
    items: [
      { label: "Audit Logs", href: "/audit", icon: FileText },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function NavItemComponent({ item, depth = 0, sidebarCollapsed = false }: { item: NavItem; depth?: number; sidebarCollapsed?: boolean }) {
  const pathname = usePathname();
  const isActive = item.href ? pathname === item.href : false;

  if (!item.href) return null;

  if (sidebarCollapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        prefetch={false}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl mx-auto transition-colors",
          isActive ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
        depth > 0 && "ml-4 text-[12px]",
        isActive
          ? "bg-white/20 text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      )}
    >
      <item.icon className={cn("shrink-0", depth > 0 ? "w-3.5 h-3.5" : "w-4 h-4")} />
      <span className="truncate leading-none flex-1">{item.label}</span>
      {item.badge !== undefined ? (
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
          isActive ? "bg-white/25 text-white" : "bg-white/20 text-white"
        )}>{item.badge}</span>
      ) : (
        <ChevronRight className={cn("w-4 h-4", isActive ? "text-white/60" : "text-white/30")} />
      )}
    </Link>
  );
}

function SectionGroup({ section, collapsed, onToggle }: { section: NavSection; collapsed: boolean; onToggle: () => void }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-1.5 mb-1 group"
      >
        <span className="text-[11px] font-semibold text-white/50 tracking-widest uppercase group-hover:text-white/70 transition-colors">
          {section.title}
        </span>
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-white/40" />
          : <ChevronDown className="w-3 h-3 text-white/40" />}
      </button>
      {!collapsed && (
        <div className="space-y-0.5 mb-2">
          {section.items.map((item) => (
            <NavItemComponent key={item.label} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (title: string) => {
    setSectionCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className={cn(
      "flex flex-col h-full bg-farumasi-600 shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
      collapsed ? "w-[68px]" : "w-60"
    )}>
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-0.5 px-2">
            {NAV.map((section, idx) => (
              <div key={section.title} className="w-full">
                {idx > 0 && <div className="w-6 h-px bg-white/15 mx-auto my-1.5" />}
                {section.items.map((item) => (
                  <NavItemComponent key={item.label} item={item} sidebarCollapsed />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 space-y-0.5">
            {NAV.map((section) => (
              <SectionGroup
                key={section.title}
                section={section}
                collapsed={!!sectionCollapsed[section.title]}
                onToggle={() => toggle(section.title)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className={cn("border-t border-white/10 shrink-0", collapsed ? "p-2" : "px-4 py-3")}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">SA</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">Super Admin</p>
              <p className="text-[10px] text-white/60 truncate">superadmin@farumasi.rw</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-white/70 shrink-0" title="Online" />
          </div>
        )}
      </div>
    </aside>
  );
}
