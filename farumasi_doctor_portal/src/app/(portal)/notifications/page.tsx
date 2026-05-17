"use client";
import { useState } from "react";
import {
  Bell, CheckCheck, AlertTriangle, Info, AlertCircle,
  Package, FileText, Users, ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockNotifications } from "@/data/mock";
import { timeAgo } from "@/lib/utils";
import type { NotificationType } from "@/types";

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  Critical: AlertCircle,
  Warning: AlertTriangle,
  Info: Info,
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-red-600 bg-red-50 border-red-100",
  Warning: "text-amber-600 bg-amber-50 border-amber-100",
  Info: "text-blue-600 bg-blue-50 border-blue-100",
};

const ICON_COLORS: Record<string, string> = {
  Critical: "text-red-600",
  Warning: "text-amber-600",
  Info: "text-blue-600",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"All" | "Unread" | "Critical" | "Warning" | "Info">("All");
  const [notifications, setNotifications] = useState(mockNotifications);

  const filtered = notifications.filter((n) => {
    if (filter === "Unread") return !n.isRead;
    if (filter === "Critical" || filter === "Warning" || filter === "Info") return n.severity === filter;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
        icon={<Bell className="w-5 h-5" />}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-farumasi-600 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {(["All", "Unread", "Critical", "Warning", "Info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filter === f
                ? "bg-farumasi-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}
            {f === "Unread" && unreadCount > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === f ? "bg-white/20" : "bg-red-100 text-red-700"}`}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((notif) => {
              const Icon = SEVERITY_ICONS[notif.severity] ?? Info;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                    !notif.isRead ? "bg-farumasi-50/40" : ""
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${SEVERITY_COLORS[notif.severity]}`}>
                    <Icon className={`w-4 h-4 ${ICON_COLORS[notif.severity]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notif.isRead ? "text-slate-900" : "text-slate-700"}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-farumasi-600" />
                        )}
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(notif.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    {notif.actionUrl && (
                      <a href={notif.actionUrl} className="text-xs text-farumasi-600 font-medium hover:underline mt-1 inline-flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
