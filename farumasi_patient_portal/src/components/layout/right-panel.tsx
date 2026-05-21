"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Bell, ShoppingCart, HelpCircle, Pill, Clock, Trash2, Package, Truck, Gift, FileText, MessageCircle, Settings, Phone, Mail } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTranslation, tf, useTimeAgo } from "@/lib/translations";
import { mockNotifications } from "@/data/mock";
import { localizeNotification } from "@/data/mock-i18n";
import { useLanguageStore } from "@/store/language-store";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";

interface RightPanelProps {
  activePanel: string;
  onClose: () => void;
}

export function RightPanel({ activePanel, onClose }: RightPanelProps) {
  const t = useTranslation();
  return (
    <div className="w-[360px] max-w-full bg-white flex flex-col animate-slide-in rounded-t-[24px] shadow-[-4px_0_24px_rgba(15,23,42,0.10)] shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900 text-base">
          {activePanel === "notifications" ? t.panel_notif : activePanel === "cart" ? t.panel_cart : t.panel_help}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activePanel === "notifications" && <NotificationsPanel />}
        {activePanel === "cart" && <CartPanel onClose={onClose} />}
        {activePanel === "help" && <HelpPanel onClose={onClose} />}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const timeAgoLocal = useTimeAgo();
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
        <span className="text-xs text-slate-500">{tf(t.panel_unread, { n: notifications.filter(n => !n.isRead).length })}</span>
        <button
          onClick={() => setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })))}
          className="text-xs text-farumasi-600 font-medium hover:underline"
        >
          {t.panel_mark_all}
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{t.panel_no_notif}</p>
        </div>
      ) : (
        <ul>
          {notifications.map((n) => {
            const ln = localizeNotification(n, lang);
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
                      {ln.title}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{timeAgoLocal(n.time)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Description — 2 lines max, mirrors Flutter */}
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-[1.4] line-clamp-2">{ln.message}</p>
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
          {t.panel_view_all_notif}
        </Link>
      </div>
    </div>
  );
}

function CartPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const router = useRouter();
  const { items: cartItems, setQty, remove } = useCartStore();
  const isGuest = useAuthStore((s) => s.isGuest);
  const enriched = Object.values(cartItems);
  const total = enriched.reduce((s, e) => s + e.medicine.price * e.qty, 0);

  const goToCheckout = () => {
    onClose();
    if (isGuest) {
      router.push("/auth/login");
    } else {
      router.push("/cart");
    }
  };

  if (enriched.length === 0) {
    return (
      <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
        <ShoppingCart className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-base font-semibold text-slate-700">{t.panel_cart_empty}</h3>
        <p className="text-sm text-slate-500 mt-1">{t.panel_cart_hint}</p>
        <Link
          href="/store"
          className="mt-4 inline-flex items-center gap-2 bg-farumasi-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-farumasi-700 transition-colors"
        >
          <Pill className="w-4 h-4" />
          {t.panel_browse}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 px-3 py-2">
        {enriched.map(({ medicine, qty }) => (
          <div key={medicine.id} className="flex items-center gap-3 py-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
              {medicine.imageUrl
                ? <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" />
                : <Pill className="w-5 h-5 text-slate-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
              <p className="text-xs text-farumasi-600 font-semibold mt-0.5">{formatPrice(medicine.price)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setQty(medicine.id, qty - 1)}
                className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-slate-600 text-sm flex items-center justify-center hover:bg-farumasi-50"
              >−</button>
              <span className="text-sm font-bold text-slate-900 w-4 text-center">{qty}</span>
              <button
                onClick={() => setQty(medicine.id, qty + 1)}
                className="w-6 h-6 rounded-lg bg-farumasi-600 text-white font-bold text-sm flex items-center justify-center hover:bg-farumasi-700"
              >+</button>
              <button onClick={() => remove(medicine.id)} className="ml-1 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-slate-500">{t.panel_total}</span>
          <span className="font-extrabold text-farumasi-700">{formatPrice(total)}</span>
        </div>
        {/* Checkout → closes sidebar immediately, full page handles the complex flow */}
        <button
          onClick={goToCheckout}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-2xl bg-farumasi-600 hover:bg-farumasi-700 text-white font-bold text-sm transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {isGuest ? "Sign In to Checkout" : t.panel_checkout}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

function HelpPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const topics = [
    { Icon: Package,       color: "text-farumasi-600", bg: "bg-farumasi-50", title: t.panel_help_track,       href: "/orders" },
    { Icon: FileText,      color: "text-indigo-600",   bg: "bg-indigo-50",   title: t.panel_help_upload_rx,   href: "/prescriptions" },
    { Icon: MessageCircle, color: "text-sky-600",      bg: "bg-sky-50",      title: t.panel_help_chat_pharm,  href: "/consult" },
    { Icon: Pill,          color: "text-farumasi-600", bg: "bg-farumasi-50", title: t.panel_help_find_med,    href: "/store" },
    { Icon: Settings,      color: "text-slate-600",    bg: "bg-slate-100",   title: t.panel_help_account,     href: "/settings" },
  ];

  return (
    <div className="p-5">
      <p className="text-sm text-slate-600 mb-4">{t.panel_help_subtitle}</p>
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
        <p className="text-sm font-semibold text-farumasi-800">{t.panel_help_still}</p>
        <p className="text-xs text-farumasi-700 mt-1">{t.panel_help_reach}</p>
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
