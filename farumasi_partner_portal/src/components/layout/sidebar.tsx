"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Boxes, ShoppingCart, BarChart3,
  DollarSign, Users, Bell, Shield, UserCog, Activity, Settings,
  HelpCircle, ChevronDown, ChevronRight, FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockKPIs } from "@/data/mock";

interface NavChild { name: string; href: string }
interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavChild[];
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Products", icon: Package,
    children: [
      { name: "Approved Catalogue", href: "/products/catalogue" },
      { name: "My Listings", href: "/products/listed" },
    ],
  },
  { name: "Inventory", href: "/inventory", icon: Boxes },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Revenue", href: "/revenue", icon: DollarSign },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Notifications", href: "/notifications", icon: Bell, badge: mockKPIs.unreadNotifications },
  { name: "Product Requests", href: "/requests", icon: FileSearch, badge: mockKPIs.pendingRequests },
  { name: "Compliance", href: "/compliance", icon: Shield },
  { name: "Team", href: "/team", icon: UserCog },
  { name: "Activity Logs", href: "/activity", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/support", icon: HelpCircle },
];

interface SidebarProps { collapsed: boolean }

export function Sidebar({ collapsed }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Products"]);

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
        "flex flex-col h-full bg-farumasi-600 transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2 space-y-0.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isExpanded = expandedItems.includes(item.name);
          const active = hasChildren ? isChildActive(item.children) : isActive(item.href);

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => !collapsed && toggleExpanded(item.name)}
                  className={cn(
                    "flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      {isExpanded
                        ? <ChevronDown className={cn("w-4 h-4", active ? "text-white/70" : "text-white/40")} />
                        : <ChevronRight className={cn("w-4 h-4", active ? "text-white/70" : "text-white/40")} />
                      }
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
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l-2 border-white/20 pl-3 pb-1">
                          {item.children!.map((child) => {
                            const childActive = pathname.startsWith(child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                prefetch={true}
                                className={cn(
                                  "flex items-center gap-2 py-2 px-2 rounded-lg text-xs font-medium transition-colors",
                                  childActive
                                    ? "text-white bg-white/15"
                                    : "text-white/70 hover:text-white hover:bg-white/10"
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", childActive ? "bg-white" : "bg-white/30")} />
                                {child.name}
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
              prefetch={true}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
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
                <span className="absolute top-1 right-1 w-2 h-2 bg-farumasi-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        {!collapsed ? (
          <p className="text-[11px] text-white/40 text-center cursor-pointer hover:text-white transition-colors">
            Terms &amp; Conditions
          </p>
        ) : (
          <div className="h-3" />
        )}
      </div>
    </div>
  );
}

