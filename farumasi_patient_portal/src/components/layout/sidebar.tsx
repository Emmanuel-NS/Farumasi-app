"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/translations";
import { useAuthStore } from "@/store/auth-store";
import {
  Store,
  Shield,
  MessageCircle,
  History,
  FileText,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  LogIn,
  Lock,
  ChevronRight,
} from "lucide-react";
import { SidebarPreferences } from "@/components/layout/sidebar-preferences";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  restricted?: boolean;
}

interface SidebarProps {
  width: number;
  collapsed: boolean;
  resizing?: boolean;
  /** Mobile drawer — keeps Settings & Help links (hidden on wide sidebar; profile menu has them). */
  isMobileDrawer?: boolean;
  /** Called after choosing a nav destination (e.g. close mobile drawer) */
  onNavigate?: () => void;
}

export function Sidebar({
  width,
  collapsed,
  resizing = false,
  isMobileDrawer = false,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslation();
  const isGuest = useAuthStore((s) => s.isGuest);
  const logout = useAuthStore((s) => s.logout);

  const primaryNav: NavItem[] = [
    { label: t.nav_home,    href: "/store",     icon: Store },
    { label: t.nav_health,  href: "/health",    icon: Shield },
    { label: t.nav_consult, href: "/consult",   icon: MessageCircle, restricted: isGuest },
    { label: t.nav_orders,  href: "/orders",    icon: History,       restricted: isGuest },
  ];

  const secondaryNav: NavItem[] = [
    { label: t.nav_prescriptions, href: "/prescriptions", icon: FileText, restricted: isGuest },
    ...(isMobileDrawer
      ? [{ label: t.nav_settings, href: "/settings", icon: SettingsIcon }]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === "/store") return pathname === "/store" || pathname.startsWith("/store/");
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = () => {
    onNavigate?.();
    logout();
    router.push("/store");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 shrink-0 patient-nav-shell",
        resizing ? "transition-none" : "transition-[width] duration-[220ms] ease-out",
      )}
      style={{ width }}
    >
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-visible scrollbar-hide pt-2.5 pb-1 px-2 space-y-0.5" aria-label="Main navigation">
        {primaryNav.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}

        <div className="mx-3 my-3.5 border-t border-[#2A6A53] dark:border-white/10" />

        {secondaryNav.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="shrink-0 px-2 pb-3 space-y-0.5">
        <SidebarPreferences collapsed={collapsed} />

        {isGuest ? (
          <Link
            href="/auth/login"
            onClick={() => onNavigate?.()}
            className={cn(
              "flex items-center rounded-xl transition-colors duration-180 hover:bg-white/10",
              collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
            )}
            title="Sign In"
          >
            <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-[#47D196]/20 flex items-center justify-center">
              <LogIn className="w-[18px] h-[18px] text-white" />
            </div>
            {!collapsed && (
              <span className="text-[13px] font-medium text-[#D2E8DE]">Sign In</span>
            )}
          </Link>
        ) : (
          <>
            {isMobileDrawer && (
              <Link
                href="/help"
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-180 border border-transparent hover:bg-white/10",
                  collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
                  isActive("/help") ? "bg-[#47D196]/20 border border-[#47D196]/40" : "",
                )}
                title={collapsed ? t.nav_help : undefined}
              >
                <div
                  className={cn(
                    "w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center",
                    isActive("/help") ? "bg-[#47D196]" : "bg-[#47D196]/20",
                  )}
                >
                  <HelpCircle
                    className={cn(
                      "w-[18px] h-[18px]",
                      isActive("/help") ? "text-[#0A2B1E]" : "text-white",
                    )}
                  />
                </div>
                {!collapsed && (
                  <span className="text-[13px] font-medium text-[#D2E8DE]">{t.nav_help}</span>
                )}
              </Link>
            )}
            <SidebarAction
              icon={LogOut}
              label="Logout"
              collapsed={collapsed}
              onClick={handleLogout}
            />
          </>
        )}

        {!collapsed && (
          <div className="pt-3 pb-1 text-center">
            <Link
              href="/legal/terms"
              className="text-[12px] text-[#9BC8B5] underline underline-offset-2 decoration-[#9BC8B5] hover:text-white transition-colors"
            >
              Terms &amp; Conditions
            </Link>
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
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.restricted) {
    return (
      <Link
        href="/auth/login"
        onClick={() => onNavigate?.()}
        title={`${item.label} (Sign in required)`}
        className={cn(
          "flex items-center rounded-xl transition-all duration-180 border border-transparent hover:bg-white/10",
          collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
        )}
      >
        <div className="w-[34px] h-[34px] shrink-0 rounded-[9px] bg-[#47D196]/20 flex items-center justify-center relative">
          <Icon className="w-[18px] h-[18px] text-white" />
          <Lock className="w-[9px] h-[9px] text-amber-300 absolute -bottom-0.5 -right-0.5" />
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-[13px] leading-none font-medium text-[#D2E8DE]">
              {item.label}
            </span>
            <Lock className="w-4 h-4 shrink-0 text-amber-300/90" />
          </>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch
      onClick={() => onNavigate?.()}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-xl transition-all duration-180",
        collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
        active
          ? "bg-[#47D196]/20 border border-[#47D196]/40"
          : "border border-transparent hover:bg-white/10",
      )}
    >
      <div
        className={cn(
          "w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center transition-colors duration-180",
          active ? "bg-[#47D196]" : "bg-[#47D196]/20",
        )}
      >
        <Icon
          className={cn(
            "w-[18px] h-[18px]",
            active ? "text-[#0A2B1E]" : "text-white",
          )}
        />
      </div>

      {!collapsed && (
        <>
          <span
            className={cn(
              "flex-1 text-[13px] leading-none",
              active ? "font-bold text-[#EFFBF5]" : "font-medium text-[#D2E8DE]",
            )}
          >
            {item.label}
          </span>
          {active && (
            <ChevronRight className="w-[18px] h-[18px] shrink-0 text-[#BFECD8]" />
          )}
        </>
      )}
    </Link>
  );
}

function SidebarAction({
  icon: Icon,
  label,
  collapsed,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center rounded-xl transition-all duration-180",
        collapsed ? "justify-center px-0 py-[9px]" : "px-[10px] py-[9px] gap-3",
        active
          ? "bg-[#47D196]/20 border border-[#47D196]/40"
          : "border border-transparent hover:bg-white/10",
      )}
    >
      <div
        className={cn(
          "w-[34px] h-[34px] shrink-0 rounded-[9px] flex items-center justify-center transition-colors duration-180",
          active ? "bg-[#47D196]" : "bg-[#47D196]/20",
        )}
      >
        <Icon
          className={cn(
            "w-[18px] h-[18px]",
            active ? "text-[#0A2B1E]" : "text-white",
          )}
        />
      </div>
      {!collapsed && (
        <span className="flex-1 text-left text-[13px] leading-none font-medium text-[#D2E8DE]">
          {label}
        </span>
      )}
    </button>
  );
}
