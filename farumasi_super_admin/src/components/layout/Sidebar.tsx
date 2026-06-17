"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ShoppingCart,
  FileText,
  DollarSign,
  Settings,
  ChevronDown,
  ChevronRight,
  Heart,
  Stethoscope,
  Bike,
  Shield,
  ClipboardList,
} from "lucide-react";

interface NavChild {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: NavChild[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/** Super Admin CIP MVP navigation */
function buildNav(isSuperAdmin: boolean): NavSection[] {
  const userChildren: NavChild[] = [
    { label: "Patients", href: "/users/patients", icon: Heart },
    { label: "Pharmacists", href: "/users/pharmacists", icon: Stethoscope },
    { label: "Riders", href: "/users/riders", icon: Bike },
  ];
  if (isSuperAdmin) {
    userChildren.push({ label: "Admins", href: "/users/admins", icon: Shield });
  }

  return [
  {
    title: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "PLATFORM",
    items: [
      {
        label: "Users",
        icon: Users,
        children: userChildren,
      },
      { label: "Pharmacies & Companies", href: "/pharmacies", icon: ShoppingBag },
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
      { label: "Finance Hub", href: "/finance", icon: DollarSign },
    ],
  },
  {
    title: "COMPLIANCE",
    items: [
      { label: "Partner Applications", href: "/partner-applications", icon: ClipboardList },
      { label: "Audit Logs", href: "/audit", icon: Shield },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];
}

function isChildActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLeaf({
  href,
  label,
  icon: Icon,
  depth = 0,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  depth?: number;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = isChildActive(pathname, href);

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        prefetch={false}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-xl mx-auto transition-colors",
          active ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
        depth > 0 && "ml-3 text-[12px] py-1.5",
        active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className={cn("shrink-0", depth > 0 ? "w-3.5 h-3.5" : "w-4 h-4")} />
      <span className="truncate leading-none flex-1">{label}</span>
    </Link>
  );
}

function NavItemBlock({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const hasChildren = Boolean(item.children?.length);
  const childActive = item.children?.some((c) => isChildActive(pathname, c.href)) ?? false;
  const [open, setOpen] = useState(childActive);

  if (hasChildren && item.children) {
    if (collapsed) {
      return (
        <div className="space-y-0.5">
          {item.children.map((c) => (
            <NavLeaf key={c.href} href={c.href} label={c.label} icon={c.icon ?? item.icon} collapsed />
          ))}
        </div>
      );
    }
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors",
            childActive ? "bg-white/15 text-white" : "text-white/85 hover:bg-white/10",
          )}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          {open ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
        </button>
        {open && (
          <div className="mt-0.5 mb-1 space-y-0.5 border-l border-white/15 ml-5 pl-1">
            {item.children.map((c) => (
              <NavLeaf key={c.href} href={c.href} label={c.label} icon={c.icon ?? Users} depth={1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) return null;
  return <NavLeaf href={item.href} label={item.label} icon={item.icon} collapsed={collapsed} />;
}

function SectionGroup({
  section,
  collapsed,
  onToggle,
}: {
  section: NavSection;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      {!collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-between w-full px-3 py-1.5 mb-1 group"
        >
          <span className="text-[11px] font-semibold text-white/50 tracking-widest uppercase group-hover:text-white/70 transition-colors">
            {section.title}
          </span>
        </button>
      )}
      {!collapsed && (
        <div className="space-y-0.5 mb-2">
          {section.items.map((item) => (
            <NavItemBlock key={item.label} item={item} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed }: SidebarProps) {
  const [, setSectionCollapsed] = useState<Record<string, boolean>>({});
  const userRole = useAuthStore((s) => s.user?.role);
  const nav = buildNav(userRole === "super_admin");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-farumasi-600 shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-0.5 px-2">
            {nav.map((section, idx) => (
              <div key={section.title} className="w-full">
                {idx > 0 && <div className="w-6 h-px bg-white/15 mx-auto my-1.5" />}
                {section.items.map((item) =>
                  item.children ? (
                    item.children.map((c) => (
                      <NavLeaf key={c.href} href={c.href} label={c.label} icon={c.icon ?? item.icon} collapsed />
                    ))
                  ) : item.href ? (
                    <NavLeaf key={item.href} href={item.href} label={item.label} icon={item.icon} collapsed />
                  ) : null,
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 space-y-0.5">
            {nav.map((section) => (
              <SectionGroup
                key={section.title}
                section={section}
                collapsed={false}
                onToggle={() => setSectionCollapsed((p) => ({ ...p, [section.title]: !p[section.title] }))}
              />
            ))}
          </div>
        )}
      </nav>

      <div className={cn("border-t border-white/10 shrink-0", collapsed ? "p-2" : "px-4 py-3")}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">SA</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-white/25 border-2 border-white/40 flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-bold">SA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">Super Admin</p>
              <p className="text-[10px] text-white/60 truncate">Platform control</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
