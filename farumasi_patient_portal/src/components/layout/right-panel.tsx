"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Bell, ShoppingCart, HelpCircle, Pill, Clock, Trash2, Package, Truck, Gift, FileText, MessageCircle, Settings, Phone, Mail } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { mockNotifications } from "@/data/mock";

interface RightPanelProps {
  activePanel: string;
  onClose: () => void;
}

export function RightPanel({ activePanel, onClose }: RightPanelProps) {
  return (
    <div className="w-[360px] max-w-full bg-white flex flex-col animate-slide-in rounded-t-[24px] shadow-[-4px_0_24px_rgba(15,23,42,0.10)] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900 text-base">
          {activePanel === "notifications" ? "Notifications" : activePanel === "cart" ? "Your Cart" : "Help & Support"}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activePanel === "notifications" && <NotificationsPanel />}
        {activePanel === "cart" && <CartPanel />}
        {activePanel === "help" && <HelpPanel />}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState(mockNotifications);

  // Lucide icon + icon colors + unread background per category — mirrors Flutter notification tile
  const catMeta: Record<string, { Icon: React.ElementType; iconBg: string; iconColor: string; unreadBg: string }> = {
    order:         { Icon: Package,  iconBg: "bg-farumasi-100", iconColor: "text-farumasi-600", unreadBg: "bg-farumasi-50"  },
    order_shipped: { Icon: Truck,    iconBg: "bg-indigo-100",   iconColor: "text-indigo-600",   unreadBg: "bg-indigo-50/70" },
    health_tip:    { Icon: Pill,     iconBg: "bg-farumasi-100", iconColor: "text-farumasi-600", unreadBg: "bg-farumasi-50"  },
    promo:         { Icon: Gift,     iconBg: "bg-purple-100",   iconColor: "text-purple-600",   unreadBg: "bg-purple-50/70" },
    reminder:      { Icon: Clock,    iconBg: "bg-amber-100",    iconColor: "text-amber-600",    unreadBg: "bg-amber-50/70"  },
    general:       { Icon: Bell,     iconBg: "bg-slate-100",    iconColor: "text-slate-500",    unreadBg: "bg-slate-50"     },
  };

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const deleteNotif = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div>
      <div className="px-5 py-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">{notifications.filter(n => !n.isRead).length} unread</span>
        <button
          onClick={() => setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })))}
          className="text-xs text-farumasi-600 font-medium hover:underline"
        >
          Mark all read
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No notifications</p>
        </div>
      ) : (
        <ul>
          {notifications.map((n) => {
            const meta = catMeta[n.category] ?? catMeta.general;
            const { Icon, iconBg, iconColor, unreadBg } = meta;
            return (
              <li
                key={n.id}
                className={cn(
                  "group flex gap-3 px-4 py-3.5 border-b border-slate-100 cursor-pointer transition-colors",
                  n.isRead ? "hover:bg-slate-50" : unreadBg
                )}
                onClick={() => markRead(n.id)}
              >
                {/* Category icon circle */}
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                  <Icon className={cn("w-4.5 h-4.5", iconColor)} strokeWidth={2} />
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0">
                  {/* Title row: title left, timestamp + delete right */}
                  <div className="flex items-center gap-1.5">
                    <p className={cn(
                      "text-[13px] leading-snug flex-1 min-w-0 truncate",
                      n.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"
                    )}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgo(n.time)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Description — 2 lines max, mirrors Flutter */}
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-[1.4] line-clamp-2">{n.message}</p>
                </div>

                {/* Unread dot */}
                {!n.isRead && <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", iconColor.replace("text-", "bg-"))} />}
              </li>
            );
          })}
        </ul>
      )}
      <div className="p-4">
        <Link href="/notifications" className="block text-center text-sm text-farumasi-600 font-medium hover:underline">
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

function CartPanel() {
  return (
    <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
      <ShoppingCart className="w-16 h-16 text-slate-200 mb-4" />
      <h3 className="text-base font-semibold text-slate-700">Your cart is empty</h3>
      <p className="text-sm text-slate-500 mt-1">Browse medicines and add items to your cart.</p>
      <Link
        href="/store"
        className="mt-4 inline-flex items-center gap-2 bg-farumasi-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-farumasi-700 transition-colors"
      >
        <Pill className="w-4 h-4" />
        Browse Medicines
      </Link>
    </div>
  );
}

function HelpPanel() {
  const topics = [
    { Icon: Package,       color: "text-farumasi-600", bg: "bg-farumasi-50", title: "Track my order",           href: "/orders" },
    { Icon: FileText,      color: "text-indigo-600",   bg: "bg-indigo-50",   title: "Upload a prescription",    href: "/prescriptions" },
    { Icon: MessageCircle, color: "text-sky-600",      bg: "bg-sky-50",      title: "Chat with a pharmacist",   href: "/consult" },
    { Icon: Pill,          color: "text-farumasi-600", bg: "bg-farumasi-50", title: "Find a medicine",          href: "/store" },
    { Icon: Settings,      color: "text-slate-600",    bg: "bg-slate-100",   title: "Account settings",         href: "/settings" },
  ];

  return (
    <div className="p-5">
      <p className="text-sm text-slate-600 mb-4">How can we help you today?</p>
      <ul className="space-y-2">
        {topics.map((t) => (
          <li key={t.title}>
            <Link
              href={t.href}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-farumasi-200 hover:bg-farumasi-50 transition-colors group"
            >
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", t.bg)}>
                <t.Icon className={cn("w-4 h-4", t.color)} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-farumasi-700">{t.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 p-4 bg-farumasi-50 rounded-2xl">
        <p className="text-sm font-semibold text-farumasi-800">Still need help?</p>
        <p className="text-xs text-farumasi-700 mt-1">Reach our support team</p>
        <div className="flex items-center gap-2 mt-2">
          <Phone className="w-3.5 h-3.5 text-farumasi-600 shrink-0" />
          <span className="text-xs text-farumasi-600 font-medium">+250 788 000 000</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Mail className="w-3.5 h-3.5 text-farumasi-600 shrink-0" />
          <span className="text-xs text-farumasi-600 font-medium">help@farumasi.rw</span>
        </div>
      </div>
    </div>
  );
}
