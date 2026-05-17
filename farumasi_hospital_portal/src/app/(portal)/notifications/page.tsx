"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, Badge } from "@/components/ui";
import { mockNotifications } from "@/data/mock";
import { notificationTypeIcon, timeAgo } from "@/lib/utils";
import type { NotificationType } from "@/types";

const TYPE_OPTS: (NotificationType | "All")[] = ["All", "Alert", "Info", "Warning", "Success"];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType | "All">("All");
  const [read, setRead] = useState<Set<string>>(new Set());

  const filtered = mockNotifications.filter((n) => filter === "All" || n.type === filter);
  const unread = mockNotifications.filter((n) => !n.isRead && !read.has(n.id)).length;

  const markAllRead = () => {
    setRead(new Set(mockNotifications.map((n) => n.id)));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <PageHeader title="Notifications" subtitle={`${unread} unread notification${unread !== 1 ? "s" : ""}`}>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4" />Mark all read
          </Button>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {TYPE_OPTS.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${filter === t ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {t} ({t === "All" ? mockNotifications.length : mockNotifications.filter((n) => n.type === t).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((n) => {
          const isRead = n.isRead || read.has(n.id);
          return (
            <Card
              key={n.id}
              className={`p-4 flex items-start gap-4 cursor-pointer hover:border-farumasi-200 transition-all ${!isRead ? "bg-farumasi-50/40 border-farumasi-100" : ""}`}
              onClick={() => setRead((prev) => new Set([...prev, n.id]))}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm ${n.type === "Alert" ? "bg-red-50" : n.type === "Warning" ? "bg-amber-50" : n.type === "Success" ? "bg-emerald-50" : "bg-blue-50"}`}>
                {notificationTypeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-semibold ${!isRead ? "text-slate-900" : "text-slate-700"}`}>{n.title}</p>
                  {!isRead && <div className="w-2 h-2 rounded-full bg-farumasi-500 shrink-0" />}
                  <Badge variant={n.type === "Alert" ? "error" : n.type === "Warning" ? "warning" : n.type === "Success" ? "success" : "info"} className="ml-auto shrink-0">
                    {n.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{n.message}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
