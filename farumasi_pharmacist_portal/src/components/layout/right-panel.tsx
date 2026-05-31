"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { notificationsService, type BackendNotification } from "@/lib/services/notifications.service";

interface RightPanelProps {
  activePanel: string;
  onClose: () => void;
}

export function RightPanel({ activePanel, onClose }: RightPanelProps) {
  return (
    <div className="w-[360px] max-w-full bg-white border-l border-slate-200 flex flex-col animate-slide-in rounded-tr-[32px] shrink-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <h2 className="font-bold text-slate-900 text-base">
          {activePanel === "notifications" ? "Notifications" : activePanel === "chat" ? "Patient Messages" : "Help"}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activePanel === "notifications" && <NotificationsPanel />}
        {activePanel === "chat" && <ChatPanel />}
        {activePanel === "help" && <HelpPanel />}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const [notifs, setNotifs] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const catIcon: Record<string, string> = { request: "📋", order: "📦", inventory: "📦", system: "⚙️", chat: "💬" };

  useEffect(() => {
    notificationsService.list({ limit: 30 })
      .then((res) => setNotifs(res.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_status: true } : n));
    await notificationsService.markRead(id).catch(() => {});
  };

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read_status: true })));
    await notificationsService.markAllRead().catch(() => {});
  };

  const unreadCount = notifs.filter((n) => !n.read_status).length;

  return (
    <div>
      <div className="px-5 py-3 flex justify-between items-center">
        <span className="text-xs text-slate-500">{unreadCount} unread</span>
        <button onClick={markAllRead} className="text-xs text-farumasi-600 font-medium hover:underline">
          Mark all read
        </button>
      </div>
      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400">Loading…</div>
      ) : notifs.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">No notifications yet</div>
      ) : notifs.map((n) => (
        <div
          key={n.id}
          className={cn("group flex gap-3 px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer", !n.read_status && "bg-farumasi-50/50")}
          onClick={() => markRead(n.id)}
        >
          <span className="text-xl shrink-0">{catIcon[n.category ?? "system"] ?? "🔔"}</span>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm text-slate-900", !n.read_status ? "font-bold" : "font-medium")}>{n.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
          </div>
          {!n.read_status && <div className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0 mt-1.5" />}
        </div>
      ))}
      <div className="p-4">
        <Link href="/notifications" className="block text-center text-sm text-farumasi-600 font-medium hover:underline">
          View all →
        </Link>
      </div>
    </div>
  );
}

function ChatPanel() {
  return (
    <div>
      <div className="px-5 py-3 flex justify-between items-center border-b border-slate-50">
        <span className="text-xs text-slate-500">Patient consultations</span>
        <Link href="/chat" className="text-xs text-farumasi-600 font-medium hover:underline">Open chat</Link>
      </div>
      <div className="py-10 text-center text-xs text-slate-400">No recent conversations</div>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="p-5">
      <p className="text-sm text-slate-600 mb-4">Pharmacist Help Center</p>
      <div className="space-y-2">
        {[
          { icon: "📋", label: "Handle prescription requests", href: "/requests" },
          { icon: "📦", label: "Manage inventory", href: "/inventory" },
          { icon: "🚚", label: "Fleet & driver management", href: "/fleet" },
          { icon: "📊", label: "View audit logs", href: "/audit" },
        ].map((t) => (
          <Link key={t.label} href={t.href} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-farumasi-50 hover:border-farumasi-200 transition-colors group">
            <span className="text-lg">{t.icon}</span>
            <span className="text-sm font-medium text-slate-700 group-hover:text-farumasi-700">{t.label}</span>
          </Link>
        ))}
      </div>
      <div className="mt-5 p-4 bg-farumasi-50 rounded-2xl">
        <p className="text-sm font-semibold text-farumasi-800">Technical Support</p>
        <p className="text-xs text-farumasi-600 mt-1">📞 +250 788 000 999</p>
        <p className="text-xs text-farumasi-600 mt-0.5">📧 support@farumasi.rw</p>
      </div>
    </div>
  );
}
