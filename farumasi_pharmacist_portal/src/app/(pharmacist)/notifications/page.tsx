"use client";

import { useState } from "react";
import { timeAgo, cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import type { NotifCategory, AppNotification } from "@/types";

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

const CAT_CHIPS: { value: "all" | NotifCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "request", label: "Requests" },
  { value: "order", label: "Orders" },
  { value: "inventory", label: "Inventory" },
  { value: "chat", label: "Chat" },
  { value: "system", label: "System" },
];

const CAT_ICONS: Record<string, string> = {
  request: "📋", order: "📦", inventory: "🏷️", chat: "💬", system: "⚙️"
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState<"all" | NotifCategory>("all");

  const filtered = notifs.filter((n) => {
    const tabMatch = tab === "all" || (tab === "unread" ? !n.isRead : n.isRead);
    const catMatch = cat === "all" || n.category === cat;
    return tabMatch && catMatch;
  });

  const markAllRead = () => setNotifs((p) => p.map((n) => ({ ...n, isRead: true })));
  const deleteNotif = (id: string) => setNotifs((p) => p.filter((n) => n.id !== id));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <button onClick={markAllRead} className="text-sm text-farumasi-600 font-medium hover:underline">
          Mark all read
        </button>
      </div>

      {/* Read/Unread tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-2xl p-1">
        {FILTER_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn("flex-1 py-2 text-sm font-semibold rounded-xl transition-all", tab === t.value ? "bg-white text-farumasi-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-5">
        {CAT_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setCat(c.value)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              cat === c.value ? "bg-farumasi-600 text-white border-farumasi-600" : "bg-white text-slate-600 border-slate-200"
            )}
          >
            {CAT_ICONS[c.value] ?? ""} {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 flex flex-col items-center text-center">
          <Bell className="w-16 h-16 text-slate-200 mb-3" />
          <p className="text-slate-600 font-semibold">No notifications here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={cn(
                "group relative bg-white rounded-2xl border border-slate-100 p-4 cursor-pointer hover:bg-slate-50 transition-colors",
                !n.isRead && "bg-farumasi-50/60 border-farumasi-100"
              )}
              onClick={() => setNotifs((p) => p.map((x) => x.id === n.id ? { ...x, isRead: true } : x))}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{CAT_ICONS[n.category] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm text-slate-900", !n.isRead ? "font-bold" : "font-medium")}>{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.time)}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0 mt-1.5" />}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs transition-opacity shrink-0 px-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
