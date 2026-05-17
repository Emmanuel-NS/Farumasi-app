"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, getInitials } from "@/lib/utils";
import { mockPharmacist, mockRequests } from "@/data/mock";
import {
  LayoutDashboard, FileText, ShoppingBag, Package,
  Truck, ClipboardList, Settings, LogOut, ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badgeCount?: number;
}

const pendingRequests = mockRequests.filter((r) => r.status === "broadcast").length;

const navItems: NavItem[] = [
  { label: "Overview",   href: "/overview",   icon: LayoutDashboard },
  { label: "Requests",   href: "/requests",   icon: FileText, badgeCount: pendingRequests },
  { label: "Orders",     href: "/orders",     icon: ShoppingBag },
  { label: "Inventory",  href: "/inventory",  icon: Package },
  { label: "Fleet",      href: "/fleet",      icon: Truck },
  { label: "Audit Logs", href: "/audit",      icon: ClipboardList },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/overview"
      ? pathname === "/overview"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-farumasi-600 transition-all duration-[220ms] ease-out overflow-hidden shrink-0",
        collapsed ? "w-[92px]" : "w-[220px]"
      )}
    >
      <nav className="flex-1 overflow-y-auto scrollbar-hide pt-2.5 pb-1 px-2 space-y-0.5">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}

        <div className="mx-3 my-3.5 border-t border-[#2A6A53]" />

        {bottomNavItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Bottom: logout + user */}
      <div className="shrink-0 px-2 pb-3 space-y-0.5">
        <Link
          href="/auth/login"
          className={cn(
            "flex items-center gap-3 rounded-xl transition-colors hover:bg-white/10",
            collapsed ? "justify-center px-0 py-2.5" : "px-[10px] py-[9px]"
          )}
        >
          <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-white/20 flex items-center justify-center">
            <LogOut className="w-[18px] h-[18px] text-white" />
          </div>
          {!collapsed && (
            <span className="text-[13px] font-medium text-[#D2E8DE]">Logout</span>
          )}
        </Link>

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 rounded-xl hover:bg-white/10 transition-colors",
            collapsed ? "justify-center px-0 py-2.5" : "px-2 py-2"
          )}
        >
          <div className="w-[34px] h-[34px] rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{getInitials(mockPharmacist.name)}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {mockPharmacist.name.split(" ")[1] ?? mockPharmacist.name.split(" ")[0]}
              </p>
              <p className="text-xs text-white/70 truncate capitalize">{mockPharmacist.role}</p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center rounded-xl transition-all duration-180",
        collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
        active
          ? "bg-white/20 border border-white/40"
          : "border border-transparent hover:bg-white/10"
      )}
    >
      {/* Icon container — 34×34px rounded-[9px] */}
      <div
        className={cn(
          "w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center transition-colors duration-180",
          active ? "bg-[#47D196]" : "bg-white/20"
        )}
      >
        <Icon className={cn("w-[18px] h-[18px]", active ? "text-[#0A2B1E]" : "text-white")} />
      </div>

      {/* Badge for collapsed mode */}
      {collapsed && item.badgeCount ? (
        <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
          {item.badgeCount}
        </span>
      ) : null}

      {/* Label + badge / chevron for expanded mode */}
      {!collapsed && (
        <>
          <span
            className={cn(
              "flex-1 text-[13px] leading-none",
              active ? "font-bold text-[#EFFFB5]" : "font-medium text-[#D2E8DE]"
            )}
          >
            {item.label}
          </span>
          {item.badgeCount ? (
            <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {item.badgeCount}
            </span>
          ) : (
            <ChevronRight
              className={cn(
                "w-[18px] h-[18px] shrink-0",
                active ? "text-[#BFECD8]" : "text-white/30"
              )}
            />
          )}
        </>
      )}
    </Link>
  );
}


interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/overview" ? pathname === "/overview" : pathname.startsWith(href);

  return (
    <div className={cn(
      "flex flex-col h-full bg-farumasi-600 transition-all duration-300 ease-in-out overflow-hidden shrink-0",
      collapsed ? "w-[68px]" : "w-[220px]"
    )}>
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors",
                    active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badgeCount ? (
                        <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {item.badgeCount}
                        </span>
                      ) : (
                        <ChevronRight className={cn("w-4 h-4", active ? "text-white/60" : "text-white/30")} />
                      )}
                    </>
                  )}
                  {collapsed && item.badgeCount ? (
                    <span className="absolute ml-4 -mt-4 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                      {item.badgeCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 px-2 py-3 space-y-1">
        <Link href="/auth/login" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Link>
        {!collapsed ? (
          <Link href="/profile" className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{getInitials(mockPharmacist.name)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{mockPharmacist.name.split(" ")[1]}</p>
              <p className="text-xs text-white/70 truncate capitalize">{mockPharmacist.role}</p>
            </div>
          </Link>
        ) : (
          <Link href="/profile" className="flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{getInitials(mockPharmacist.name)}</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
