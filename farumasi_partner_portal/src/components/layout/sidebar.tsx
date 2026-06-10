"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart,
  DollarSign, Settings, HelpCircle, ChevronDown, FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from "@/lib/layout-constants";
import { useLayoutDataStore } from "@/lib/store/layout-data";

interface NavChild { name: string; href: string }
interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavChild[];
}

const baseNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Products", icon: Package,
    children: [
      { name: "Approved Catalogue", href: "/products/catalogue" },
      { name: "My Listings", href: "/products/listed" },
    ],
  },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Revenue", href: "/revenue", icon: DollarSign },
  { name: "Requests", href: "/requests", icon: FileSearch },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/support", icon: HelpCircle },
];

interface SidebarProps { collapsed: boolean }

const navItemClass = (active: boolean) =>
  cn(
    "flex items-center w-full min-h-[46px] gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] leading-snug font-semibold transition-colors",
    active
      ? "bg-white/20 text-white shadow-sm"
      : "text-white/85 hover:bg-white/10 hover:text-white",
  );

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Products"]);
  const pendingRequests = useLayoutDataStore(s => s.pendingRequests);

  const navigation: NavItem[] = baseNavigation.map(item => {
    if (item.name === "Requests") return { ...item, badge: pendingRequests };
    return item;
  });

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const isActive = (href?: string) =>
    href ? pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard") : false;
  const isChildActive = (children?: NavChild[]) =>
    children?.some(c => pathname.startsWith(c.href)) ?? false;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-farumasi-600 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      )}
    >
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isExpanded = expandedItems.includes(item.name);
          const active = hasChildren ? isChildActive(item.children) : isActive(item.href);

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  type="button"
                  onClick={() => !collapsed && toggleExpanded(item.name)}
                  className={navItemClass(active)}
                >
                  <Icon className="w-[22px] h-[22px] shrink-0 stroke-[1.75]" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "w-[18px] h-[18px] shrink-0 transition-transform",
                          active ? "text-white/80" : "text-white/45",
                          isExpanded ? "rotate-0" : "-rotate-90",
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && (
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-[18px] mt-1 space-y-0.5 border-l-2 border-white/25 pl-3.5 pb-1">
                          {item.children!.map((child) => {
                            const childActive = pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  "flex items-center gap-2.5 min-h-[40px] py-2 px-2.5 rounded-lg text-[13px] font-medium transition-colors",
                                  childActive
                                    ? "text-white bg-white/15"
                                    : "text-white/75 hover:text-white hover:bg-white/10",
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    childActive ? "bg-white" : "bg-white/35",
                                  )}
                                />
                                <span className="truncate">{child.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(navItemClass(active), "relative")}
            >
              <Icon className="w-[22px] h-[22px] shrink-0 stroke-[1.75]" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        "text-[11px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5 shrink-0",
                        active ? "bg-white/25 text-white" : "bg-white/20 text-white",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge != null && item.badge > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-4 py-3.5">
        {!collapsed ? (
          <Link href="/support" className="block text-xs text-white/50 text-center hover:text-white/80 transition-colors">
            Terms &amp; Conditions
          </Link>
        ) : (
          <div className="h-3" />
        )}
      </div>
    </div>
  );
}
