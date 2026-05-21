"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";
import { mockUser } from "@/data/mock";
import { getInitials } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import {
  Store,
  HeartPulse,
  MessageCircle,
  ShoppingBag,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslation();

  const navItems: NavItem[] = [
    { label: t.nav_home,        href: "/store",         icon: Store        },
    { label: t.nav_health,      href: "/health",        icon: HeartPulse   },
    { label: t.nav_consult,     href: "/consult",       icon: MessageCircle },
    { label: t.nav_orders,      href: "/orders",        icon: ShoppingBag  },
    { label: t.nav_prescriptions, href: "/prescriptions", icon: FileText   },
  ];

  const bottomItems: NavItem[] = [
    { label: t.nav_settings, href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/store") return pathname === "/store" || pathname.startsWith("/store/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-[220ms] ease-out overflow-hidden shrink-0",
        "bg-farumasi-600",
        collapsed ? "w-[92px]" : "w-[200px]"
      )}
    >
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide pt-2.5 pb-1 px-2 space-y-0.5">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}

        {/* Divider */}
        <div className="mx-3 my-3.5 border-t border-[#2A6A53]" />

        {bottomItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Spacer pushes logout + user to bottom */}
      <div className="shrink-0 px-2 pb-3 space-y-0.5">
        {/* Logout */}
        <Link
          href="/auth/login"
          className={cn(
            "flex items-center gap-3 rounded-xl transition-colors duration-180",
            collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]",
            "hover:bg-white/10"
          )}
        >
          <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-white/20 flex items-center justify-center">
            <LogOut className="w-[18px] h-[18px] text-white" />
          </div>
          {!collapsed && (
            <span className="text-[13px] font-medium text-[#D2E8DE]">Logout</span>
          )}
        </Link>

        {/* User info */}
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-2.5 rounded-xl hover:bg-white/10 transition-colors",
            collapsed ? "justify-center px-0 py-2.5" : "px-2 py-2"
          )}
        >
          <div className="w-[34px] h-[34px] rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{getInitials(mockUser.name)}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{mockUser.name.split(" ")[0]}</p>
              <p className="text-xs text-white/70 truncate">Patient</p>
            </div>
          )}
        </Link>

        {/* Terms */}
        {!collapsed && (
          <div className="pt-3 pb-1 text-center">
            <a
              href="#"
              className="text-[12px] text-[#9BC8B5] underline underline-offset-2 decoration-[#9BC8B5] hover:text-white transition-colors"
            >
              Terms &amp; Conditions
            </a>
          </div>
        )}
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
      prefetch
      className={cn(
        "flex items-center rounded-xl transition-all duration-180",
        collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
        active
          ? "bg-white/20 border border-white/40"
          : "border border-transparent hover:bg-white/10"
      )}
    >
      {/* Icon container — matches Flutter 34×34 rounded-[9px] */}
      <div
        className={cn(
          "w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center transition-colors duration-180",
          active ? "bg-[#47D196]" : "bg-white/20"
        )}
      >
        <Icon
          className={cn(
            "w-[18px] h-[18px]",
            active ? "text-[#0A2B1E]" : "text-white"
          )}
        />
      </div>

      {/* Label + chevron */}
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
          <ChevronRight
            className={cn(
              "w-[18px] h-[18px] shrink-0",
              active ? "text-[#BFECD8]" : "text-white/30"
            )}
          />
        </>
      )}
    </Link>
  );
}

