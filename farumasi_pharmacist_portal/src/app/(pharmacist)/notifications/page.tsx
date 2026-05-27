"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo, cn } from "@/lib/utils";
import { Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  notificationsService,
  type BackendNotification,
} from "@/lib/services/notifications.service";

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const;
type Tab = (typeof FILTER_TABS)[number]["value"];

const CAT_CHIPS = [
  { value: "all",       label: "All" },
  { value: "request",   label: "Requests" },
  { value: "order",     label: "Orders" },
  { value: "inventory", label: "Inventory" },
  { value: "chat",      label: "Chat" },
  { value: "system",    label: "System" },
] as const;
type CatFilter = (typeof CAT_CHIPS)[number]["value"];

const CAT_ICONS: Record<string, string> = {
  request: "📋", order: "📦", inventory: "🏷️", chat: "💬", system: "⚙️",
};

export default function NotificationsPage() {
  const [items, setItems]     = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("all");
  const [cat, setCat]         = useState<CatFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsService.list({ limit: 100 });
      setItems(res.items);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClick = async (n: BackendNotification) => {
    if (n.read_status) return;
    setItems((p) => p.map((x) => x.id === n.id ? { ...x, read_status: true } : x));
    try {
      await notificationsService.markRead(n.id);
    } catch {
      setItems((p) => p.map((x) => x.id === n.id ? { ...x, read_status: false } : x));
      toast.error("Could not mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    const snapshot = items;
    setItems((p) => p.map((n) => ({ ...n, read_status: true })));
    try {
      await notificationsService.markAllRead();
      toast.success("All marked as read");
    } catch {
      setItems(snapshot);
      toast.error("Could not mark all as read");
    }
  };

  const filtered = items.filter((n) => {
    const tabMatch = tab === "all" || (tab === "unread" ? !n.read_status : n.read_status);
    const catMatch = cat === "all" || (n.category ?? "system") === cat;
    return tabMatch && catMatch;
  });

  const unreadCount = items.filter((n) => !n.read_status).length;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-farumasi-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm text-farumasi-600 font-medium hover:underline">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-4 bg-slate-100 rounded-2xl p-1">
        {FILTER_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 py-2 text-sm font-semibold rounded-xl transition-all",
              tab === t.value ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {CAT_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              cat === c.value ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200",
            )}
          >
            {CAT_ICONS[c.value] ?? ""} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-farumasi-200 border-t-farumasi-600 rounded-full animate-spin mb-3" />
          <p className="text-slate-400 text-sm">Loading notifications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <Bell className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No notifications here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "group relative bg-white rounded-2xl border border-slate-100 p-4 cursor-pointer hover:bg-slate-50 transition-colors",
                !n.read_status && "bg-farumasi-50/60 border-farumasi-100",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{CAT_ICONS[n.category ?? "system"] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm text-slate-900", !n.read_status ? "font-bold" : "font-medium")}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.read_status && <div className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
