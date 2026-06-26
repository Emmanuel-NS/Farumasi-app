"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { X, ShoppingCart, HelpCircle, Trash2, FileText, MessageCircle, Settings, Phone, Mail, Pill } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useTranslation, tf, useTimeAgo } from "@/lib/translations";
import { useLanguageStore } from "@/store/language-store";
import { useCartStore } from "@/store/cart-store";
import { cartLineKey } from "@/lib/packaging-classes";
import { cartLineUnitPrice } from "@/lib/cart-pricing";
import { useAuthStore } from "@/store/auth-store";
import type { AppNotification } from "@/types";
import { notificationsService } from "@/lib/services/notifications.service";
import { startVisibleInterval } from "@/lib/polling";
import { openNotification } from "@/lib/notification-links";
import {
  filterDeletedNotifications,
  notificationStyle,
  persistDeletedNotificationId,
} from "@/lib/notification-ui";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";

interface RightPanelProps {
  activePanel: string;
  onClose: () => void;
  /** Full-height slide-over on mobile (rendered inside a portal backdrop). */
  overlay?: boolean;
}

export function RightPanel({ activePanel, onClose, overlay = false }: RightPanelProps) {
  const t = useTranslation();
  return (
    <div
      className={cn(
        "patient-right-panel bg-white flex flex-col overflow-hidden h-full min-h-0",
        overlay
          ? "absolute inset-y-0 right-0 z-10 w-full max-w-[360px] animate-slide-in shadow-2xl dark:shadow-black/50"
          : "w-[360px] max-w-full shrink-0 animate-slide-in rounded-t-[24px] shadow-[-4px_0_24px_rgba(15,23,42,0.10)]",
      )}
    >
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activePanel === "notifications" && <NotificationsPanel />}
        {activePanel === "cart" && <CartPanel onClose={onClose} />}
        {activePanel === "help" && <HelpPanel onClose={onClose} />}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const router = useRouter();
  const t = useTranslation();
  const lang = useLanguageStore((s) => s.lang);
  const timeAgoLocal = useTimeAgo();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      notificationsService.getMyNotifications()
        .then((items) => {
          if (!cancelled) setNotifications(filterDeletedNotifications(items));
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    load();
    const stop = startVisibleInterval(load, 20_000);
    return () => {
      cancelled = true;
      stop();
    };
  }, [lang]);

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    void notificationsService.markRead(id).catch(() => {});
  };

  const deleteNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    persistDeletedNotificationId(id);
  };

  const handleOpen = async (n: AppNotification) => {
    await openNotification(
      { id: n.id, read_status: n.isRead, action_url: n.actionUrl },
      router,
      async (id) => {
        setNotifications((prev) => prev.map((row) => (row.id === id ? { ...row, isRead: true } : row)));
        await notificationsService.markRead(id);
      },
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    void notificationsService.markAllRead().catch(() => {});
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-5 py-3 flex items-center justify-between border-b border-slate-50">
        <span className="text-xs text-slate-500">{tf(t.panel_unread, { n: notifications.filter(n => !n.isRead).length })}</span>
        <button
          onClick={handleMarkAllRead}
          className="text-xs text-farumasi-600 font-medium hover:underline"
        >
          {t.panel_mark_all}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-farumasi-300 border-t-farumasi-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center px-6">
          <p className="text-slate-500 text-sm font-medium">{t.panel_no_notif}</p>
          <p className="text-slate-400 text-xs mt-1">Order updates, prescriptions, and deliveries appear here.</p>
        </div>
      ) : (
        <ul>
          {notifications.map((n) => {
            const style = notificationStyle(n.category);
            return (
              <li
                key={n.id}
                className={cn(
                  "group flex gap-3 px-4 py-3.5 border-b border-slate-100 border-l-4 cursor-pointer transition-colors",
                  style.accentClass,
                  n.isRead ? "hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-transparent" : style.unreadBg,
                )}
                onClick={() => void handleOpen(n)}
              >
                <div className="shrink-0 mt-0.5">
                  <FarumasiLogo size={34} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", style.chipClass)}>
                      {style.label}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap ml-auto">{timeAgoLocal(n.time)}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <p className={cn(
                      "text-[13px] leading-snug flex-1 min-w-0",
                      n.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"
                    )}>
                      {n.title}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all"
                      aria-label="Remove notification"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-[1.4] line-clamp-2">{n.message}</p>
                  {n.actionUrl && (
                    <p className="text-[10px] text-farumasi-600 font-semibold mt-1">Open →</p>
                  )}
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0 mt-1" />}
              </li>
            );
          })}
        </ul>
      )}
      </div>
      <div className="shrink-0 border-t border-slate-100 bg-white dark:bg-slate-800 p-4 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)]">
        <Link
          href="/notifications"
          className="flex items-center justify-center w-full h-10 rounded-xl bg-farumasi-50 text-sm text-farumasi-700 font-semibold hover:bg-farumasi-100 transition-colors"
        >
          {t.panel_view_all_notif}
        </Link>
      </div>
    </div>
  );
}

function CartPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { items: cartItems, setQty, remove } = useCartStore();
  const isGuest = useAuthStore((s) => s.isGuest);
  const enriched = Object.values(cartItems);
  // Pack and partial prices must never be mixed into a single range.
  // Partial lines: sum = per-unit price × qty (unitPriceFrom); never use pack price as fallback.
  // Pack lines: min uses medicine.price, max uses medicine.maxPrice.
  const totalPack    = enriched.filter(e => e.sellMode !== "partial")
    .reduce((s, e) => s + e.medicine.price * e.qty, 0);
  const totalPackMax = enriched.filter(e => e.sellMode !== "partial")
    .reduce((s, e) => s + (e.medicine.maxPrice ?? e.medicine.price) * e.qty, 0);
  const totalPartial = enriched.filter(e => e.sellMode === "partial")
    .reduce((s, e) => s + (e.medicine.unitPriceFrom ?? 0) * e.qty, 0);
  const total    = totalPack + totalPartial;
  const totalMax = totalPackMax + totalPartial;

  const goToCheckout = () => {
    onClose();
    const target = isGuest ? "/auth/login" : "/cart";
    if (pathname !== target) {
      router.push(target);
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
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-50 px-3 py-2 scrollbar-hide">
        {enriched.map(({ medicine, qty, sellMode }) => {
          const lineKey = cartLineKey(medicine.id, sellMode);
          const linePrice = cartLineUnitPrice(medicine, sellMode);
          const unitLabel = sellMode === "partial"
            ? (medicine.partialUnitName ?? "unit")
            : (medicine.unitsPerPack && medicine.unitsPerPack > 1 ? "pack" : "item");
          const packMax = sellMode === "pack" && medicine.maxPrice && medicine.maxPrice > medicine.price
            ? medicine.maxPrice
            : null;
          const lineTotalMin = linePrice * qty;
          const lineTotalMax = packMax ? packMax * qty : null;
          return (
          <div key={lineKey} className="flex items-center gap-3 py-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
              {medicine.imageUrl
                ? <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" />
                : <Pill className="w-5 h-5 text-slate-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {medicine.id && !medicine.id.startsWith("rx-") ? (
                <Link
                  href={`/store/${medicine.id}`}
                  onClick={onClose}
                  className="text-sm font-bold text-farumasi-700 hover:underline truncate block"
                >
                  {medicine.name}
                </Link>
              ) : (
                <p className="text-sm font-bold text-slate-900 truncate">{medicine.name}</p>
              )}
              {sellMode === "partial" && linePrice === 0 ? (
                <p className="text-xs text-slate-400 italic mt-0.5">Price at pharmacy</p>
              ) : packMax ? (
                <p className="text-xs text-farumasi-600 font-semibold mt-0.5">
                  {formatPrice(linePrice)} – {formatPrice(packMax)}
                  <span className="text-slate-500 font-medium"> / {unitLabel}</span>
                  {qty > 1 && (
                    <span className="block text-[11px] text-slate-500 font-medium mt-0.5">
                      {formatPrice(lineTotalMin)} – {formatPrice(lineTotalMax!)}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-farumasi-600 font-semibold mt-0.5">
                  {formatPrice(qty > 1 ? lineTotalMin : linePrice)}
                  {sellMode === "partial" ? ` / ${unitLabel}` : qty > 1 ? "" : ` / ${unitLabel}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setQty(lineKey, qty - 1)}
                className="w-6 h-6 rounded-lg bg-slate-100 font-bold text-slate-600 text-sm flex items-center justify-center hover:bg-farumasi-50"
              >−</button>
              <span className="text-sm font-bold text-slate-900 w-4 text-center">{qty}</span>
              <button
                onClick={() => setQty(lineKey, qty + 1)}
                className="w-6 h-6 rounded-lg bg-farumasi-600 text-white font-bold text-sm flex items-center justify-center hover:bg-farumasi-700"
              >+</button>
              <button onClick={() => remove(lineKey)} className="ml-1 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );})}
      </div>
      {/* Footer */}
      <div className="shrink-0 border-t border-slate-100 p-4">
        {/* Show separate lines only when both types are present */}
        {totalPack > 0 && totalPartial > 0 ? (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Whole packs</span>
              <span>{formatPrice(totalPack)}{totalPackMax > totalPack ? ` – ${formatPrice(totalPackMax)}` : ""}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Partial units</span>
              <span>{totalPartial > 0 ? formatPrice(totalPartial) : "Price at pharmacy"}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-farumasi-700 pt-1 border-t border-slate-100">
              <span>{t.panel_total}</span>
              <span>{formatPrice(total)}{totalMax > total ? ` – ${formatPrice(totalMax)}` : ""}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-500">{t.panel_total}</span>
            <span className="font-extrabold text-farumasi-700">
              {formatPrice(total)}{totalMax > total ? ` – ${formatPrice(totalMax)}` : ""}
            </span>
          </div>
        )}
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

const HELP_PANEL_FAQ = [
  {
    q: "How do I order medicine?",
    a: "Browse the Store, add items to your cart, then check out. We'll match you to the nearest verified pharmacy that has all your items in stock.",
  },
  {
    q: "Can I upload a prescription?",
    a: "Yes. Go to Prescriptions → New, then upload a photo or PDF. A licensed pharmacist will review it before dispensing.",
  },
  {
    q: "How long does delivery take?",
    a: "Most Kigali deliveries arrive within 60 minutes. Out-of-Kigali timing depends on the pharmacy and rider availability.",
  },
  {
    q: "What payment methods are supported?",
    a: "MTN MoMo and card via Pesapal. A small processing fee is added to your total at checkout.",
  },
  {
    q: "How do I cancel an order?",
    a: "Open the order from Orders → tap Cancel. Cancellation is free until the pharmacy starts preparing your items.",
  },
];

function HelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto scrollbar-hide p-5">
      <p className="text-sm text-slate-600 mb-4">We&apos;re here for you, every step of the way.</p>

      {/* Contact cards */}
      <div className="space-y-2">
        <a href="tel:+250788000000" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-farumasi-300 transition-colors">
          <div className="w-9 h-9 rounded-full bg-farumasi-50 flex items-center justify-center shrink-0">
            <Phone className="w-4 h-4 text-farumasi-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Call us</p>
            <p className="text-sm font-semibold text-slate-800 truncate">+250 788 000 000</p>
          </div>
        </a>
        <a href="mailto:support@farumasi.com" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-farumasi-300 transition-colors">
          <div className="w-9 h-9 rounded-full bg-farumasi-50 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-farumasi-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Email</p>
            <p className="text-sm font-semibold text-slate-800 truncate">support@farumasi.com</p>
          </div>
        </a>
        <a href="https://wa.me/250788000000" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-farumasi-300 transition-colors">
          <div className="w-9 h-9 rounded-full bg-farumasi-50 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-farumasi-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">WhatsApp</p>
            <p className="text-sm font-semibold text-slate-800 truncate">Chat with us</p>
          </div>
        </a>
      </div>

      {/* FAQ */}
      <h3 className="mt-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Frequently asked</h3>
      <div className="mt-2 space-y-2">
        {HELP_PANEL_FAQ.map((item) => (
          <details key={item.q} className="bg-white rounded-xl border border-slate-100 p-3 group">
            <summary className="text-sm font-semibold text-slate-800 cursor-pointer list-none flex items-center justify-between gap-2">
              <span className="min-w-0">{item.q}</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
            </summary>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>

      <Link
        href="/help"
        onClick={onClose}
        className="mt-5 flex items-center justify-center gap-1 w-full h-10 rounded-xl border border-farumasi-200 text-farumasi-700 hover:bg-farumasi-50 text-sm font-semibold transition-colors"
      >
        Open full Help & Support
      </Link>
    </div>
  );
}
