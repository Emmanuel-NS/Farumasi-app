"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notificationsService } from "@/lib/services/notifications.service";
import { cn } from "@/lib/utils";
import { useTranslation, tf, useTimeAgo } from "@/lib/translations";
import { Trash2 } from "lucide-react";
import type { AppNotification } from "@/types";
import { startVisibleInterval } from "@/lib/polling";
import { openNotification } from "@/lib/notification-links";
import { useDynamicTranslation } from "@/hooks/use-dynamic-translation";
import {
  filterDeletedNotifications,
  notificationStyle,
  persistDeletedNotificationId,
} from "@/lib/notification-ui";
import { FarumasiLogo } from "@/components/shared/farumasi-logo";

const CAT_FILTERS = ["All", "Order", "Health", "Promo", "Reminder"];

const catMatch: Record<string, string[]> = {
  All: [],
  Order: ["order", "order_shipped", "delivery", "payment"],
  Health: ["health_tip", "prescription"],
  Promo: ["promo"],
  Reminder: ["reminder"],
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<"All" | "Read" | "Unread">("All");
  const [cat, setCat] = useState("All");
  const t = useTranslation();
  const timeAgoLocal = useTimeAgo();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      notificationsService.getMyNotifications()
        .then((items) => {
          if (cancelled) return;
          setNotifications(filterDeletedNotifications(items));
        })
        .catch(() => {});
    };
    load();
    const stop = startVisibleInterval(load, 20_000);
    return () => {
      cancelled = true;
      stop();
    };
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
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, isRead: true } : n));
    notificationsService.markRead(id).catch(() => {
      setNotifications((p) => p.map((n) => n.id === id ? { ...n, isRead: false } : n));
    });
  };

  const handleOpen = async (n: AppNotification) => {
    await openNotification(
      { id: n.id, read_status: n.isRead, action_url: n.actionUrl },
      router,
      async (id) => {
        setNotifications((p) => p.map((row) => (row.id === id ? { ...row, isRead: true } : row)));
        await notificationsService.markRead(id);
      },
    );
  };
  // Local-only — backend has no notification delete endpoint.
  // Deletion persists across reloads via localStorage.
  const deleteN = (id: string) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
    persistDeletedNotificationId(id);
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
        <div className="py-24 flex flex-col items-center text-center px-6">
          <p className="text-slate-600 font-semibold">{t.notif_empty}</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            You will be notified when orders move, prescriptions are reviewed, or deliveries arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              timeAgo={timeAgoLocal(n.time)}
              onOpen={() => void handleOpen(n)}
              onDelete={(e) => { e.stopPropagation(); deleteN(n.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  timeAgo,
  onOpen,
  onDelete,
}: {
  notification: AppNotification;
  timeAgo: string;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const title = useDynamicTranslation(n.title, `notification:${n.category}:title`);
  const message = useDynamicTranslation(n.message, `notification:${n.category}:body`);
  const style = notificationStyle(n.category);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group flex gap-3 bg-white rounded-2xl border px-4 py-3.5 cursor-pointer hover:shadow-sm transition-all border-l-4",
        style.accentClass,
        !n.isRead ? style.unreadBg : "border-slate-100",
      )}
    >
      <div className="shrink-0 mt-0.5">
        <FarumasiLogo size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", style.chipClass)}>
            {style.label}
          </span>
          <span className="text-[10px] text-slate-400 ml-auto">{timeAgo}</span>
        </div>
        <p className={cn("text-sm text-slate-900", !n.isRead ? "font-bold" : "font-medium")}>
          {title.text}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{message.text}</p>
        {n.actionUrl && (
          <p className="text-[10px] text-farumasi-600 font-medium mt-1.5">Tap to open →</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {!n.isRead && <div className="w-2 h-2 rounded-full bg-farumasi-500" />}
        <button
          onClick={onDelete}
          aria-label="Delete notification"
          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-400 transition-all rounded-lg hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
