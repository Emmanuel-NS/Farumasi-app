"use client";

import { useState, useEffect } from "react";
import { notificationsService } from "@/lib/services/notifications.service";
import { cn } from "@/lib/utils";
import { useTranslation, tf, useTimeAgo } from "@/lib/translations";
import { Bell, Trash2, X } from "lucide-react";
import type { AppNotification } from "@/types";

const CAT_FILTERS = ["All", "Order", "Health", "Promo", "Reminder"];

const catIcon: Record<string, string> = {
  order: "📦",
  order_shipped: "🚚",
  health_tip: "💊",
  promo: "🎁",
  reminder: "⏰",
  general: "🔔",
};

const catMatch: Record<string, string[]> = {
  All: [],
  Order: ["order", "order_shipped"],
  Health: ["health_tip"],
  Promo: ["promo"],
  Reminder: ["reminder"],
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"All" | "Read" | "Unread">("All");
  const [cat, setCat] = useState("All");
  const t = useTranslation();
  const timeAgoLocal = useTimeAgo();

  useEffect(() => {
    notificationsService.getMyNotifications()
      .then((items) => {
        // Filter out notifications the user has locally dismissed.
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("farumasi_deleted_notifs");
            const ids: string[] = raw ? JSON.parse(raw) : [];
            if (Array.isArray(ids) && ids.length) {
              setNotifications(items.filter((n) => !ids.includes(n.id)));
              return;
            }
          } catch {
            /* ignore */
          }
        }
        setNotifications(items);
      })
      .catch(() => {});
  }, []);

  const FILTER_LABELS = [t.notif_filter_all, t.notif_filter_unread, t.notif_filter_read];
  const CAT_FILTER_LABELS = [t.notif_cat_all, t.notif_cat_order, t.notif_cat_health, t.notif_cat_promo, t.notif_cat_reminder];

  const filtered = notifications.filter((n) => {
    const readOk = filter === "All" || (filter === "Read" ? n.isRead : !n.isRead);
    const catOk = cat === "All" || catMatch[cat]?.includes(n.category);
    return readOk && catOk;
  });

  const markRead = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;
    // Optimistic update
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, isRead: true } : n));
    notificationsService.markRead(id).catch(() => {
      // Revert on failure
      setNotifications((p) => p.map((n) => n.id === id ? { ...n, isRead: false } : n));
    });
  };
  // Local-only — backend has no notification delete endpoint.
  // Deletion persists across reloads via localStorage.
  const deleteN = (id: string) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("farumasi_deleted_notifs");
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.includes(id)) {
          localStorage.setItem(
            "farumasi_deleted_notifs",
            JSON.stringify([...ids, id]),
          );
        }
      } catch {
        /* ignore */
      }
    }
  };
  const markAllRead = () => {
    const snapshot = notifications;
    setNotifications((p) => p.map((n) => ({ ...n, isRead: true })));
    notificationsService.markAllRead().catch(() => {
      setNotifications(snapshot);
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.notif_title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tf(t.notif_unread, { n: notifications.filter(n => !n.isRead).length })}</p>
        </div>
        <button onClick={markAllRead} className="text-sm text-farumasi-600 font-medium hover:underline shrink-0">
          {t.notif_mark_all}
        </button>
      </div>

      {/* Read/Unread filter */}
      <div className="flex bg-slate-100 rounded-2xl p-1 w-fit mb-4">
        {(["All", "Unread", "Read"] as const).map((f, i) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 rounded-xl text-sm font-semibold transition-all",
              filter === f ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {FILTER_LABELS[i]}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {CAT_FILTERS.map((c, i) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border",
              cat === c
                ? "bg-farumasi-600 text-white border-farumasi-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-farumasi-300"
            )}
          >
            {CAT_FILTER_LABELS[i]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <Bell className="w-14 h-14 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">{t.notif_empty}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const ln = n;
            return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={cn(
                "group flex gap-3 bg-white rounded-2xl border px-4 py-3.5 cursor-pointer hover:shadow-sm transition-all",
                !n.isRead ? "border-farumasi-100 bg-farumasi-50/50" : "border-slate-100"
              )}
            >
              <span className="text-2xl shrink-0">{catIcon[n.category] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm text-slate-900", !n.isRead ? "font-bold" : "font-medium")}>{ln.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{ln.message}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">{timeAgoLocal(n.time)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-farumasi-500" />}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteN(n.id); }}
                  aria-label="Delete notification"
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-400 transition-all rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
