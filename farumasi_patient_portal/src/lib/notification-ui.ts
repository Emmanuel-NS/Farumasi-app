import type { NotificationCategory } from "@/types";

export interface NotificationStyle {
  label: string;
  accentClass: string;
  chipClass: string;
  unreadBg: string;
}

/** Text-first notification styling — no generic icon sets. */
export const NOTIFICATION_STYLE: Record<NotificationCategory, NotificationStyle> = {
  order: {
    label: "Order",
    accentClass: "border-l-farumasi-600",
    chipClass: "bg-farumasi-100 text-farumasi-800 dark:bg-emerald-950/60 dark:text-emerald-200",
    unreadBg: "bg-farumasi-50/90 dark:bg-emerald-950/30",
  },
  order_shipped: {
    label: "Shipping",
    accentClass: "border-l-indigo-600",
    chipClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
    unreadBg: "bg-indigo-50/80 dark:bg-indigo-950/30",
  },
  delivery: {
    label: "Delivery",
    accentClass: "border-l-indigo-600",
    chipClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200",
    unreadBg: "bg-indigo-50/80 dark:bg-indigo-950/30",
  },
  payment: {
    label: "Payment",
    accentClass: "border-l-emerald-600",
    chipClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
    unreadBg: "bg-emerald-50/80 dark:bg-emerald-950/30",
  },
  prescription: {
    label: "Prescription",
    accentClass: "border-l-amber-600",
    chipClass: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
    unreadBg: "bg-amber-50/80 dark:bg-amber-950/30",
  },
  health_tip: {
    label: "Health",
    accentClass: "border-l-teal-600",
    chipClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200",
    unreadBg: "bg-teal-50/80 dark:bg-teal-950/30",
  },
  promo: {
    label: "Offer",
    accentClass: "border-l-purple-600",
    chipClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200",
    unreadBg: "bg-purple-50/80 dark:bg-purple-950/30",
  },
  reminder: {
    label: "Reminder",
    accentClass: "border-l-orange-600",
    chipClass: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200",
    unreadBg: "bg-orange-50/80 dark:bg-orange-950/30",
  },
  general: {
    label: "Update",
    accentClass: "border-l-slate-500",
    chipClass: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    unreadBg: "bg-slate-50 dark:bg-slate-800/80",
  },
};

export function notificationStyle(category: NotificationCategory): NotificationStyle {
  return NOTIFICATION_STYLE[category] ?? NOTIFICATION_STYLE.general;
}

const DELETED_KEY = "farumasi_deleted_notifs";

export function loadDeletedNotificationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function persistDeletedNotificationId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = loadDeletedNotificationIds();
    if (!ids.includes(id)) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...ids, id]));
    }
  } catch {
    /* ignore */
  }
}

export function filterDeletedNotifications<T extends { id: string }>(items: T[]): T[] {
  const deleted = new Set(loadDeletedNotificationIds());
  if (deleted.size === 0) return items;
  return items.filter((n) => !deleted.has(n.id));
}
