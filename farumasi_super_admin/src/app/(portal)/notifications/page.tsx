"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Bell, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { openNotification, notificationHref } from "@/lib/notification-links";

interface BackendNotification {
  id: string;
  title: string;
  message: string;
  category?: string | null;
  read_status: boolean;
  action_url?: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<BackendNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendNotification[]; total: number }>("/notifications/", { params: { limit: 100, offset: 0 } })
      .then((r) => { setNotifications(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unread = notifications.filter((n) => !n.read_status).length;

  const categoryColor = (cat?: string | null) => {
    if (cat === "alert" || cat === "critical") return "bg-red-500";
    if (cat === "warning" || cat === "withdrawal") return "bg-amber-500";
    if (cat === "success") return "bg-emerald-500";
    return "bg-blue-500";
  };

  async function handleClick(n: BackendNotification) {
    await openNotification(
      n,
      router,
      async (id) => {
        await api.patch(`/notifications/${id}/read`);
        setNotifications((prev) =>
          prev.map((row) => (row.id === id ? { ...row, read_status: true } : row)),
        );
      },
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="System notifications and platform alerts" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={total} icon={Bell} color="text-farumasi-700" />
        <StatCard label="Unread" value={unread} icon={Bell} color="text-red-700" />
        <StatCard label="Read" value={notifications.length - unread} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Loaded" value={notifications.length} icon={Bell} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-farumasi-600" /><CardTitle>All Notifications</CardTitle></div>
          {unread > 0 && <Badge variant="error">{unread} unread</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading notifications…</span>
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No notifications.</p>
          )}
          <div className="divide-y divide-slate-50">
            {!loading && notifications.map((n) => {
              const href = notificationHref(n.action_url);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleClick(n)}
                  disabled={!href}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 w-full text-left transition-colors",
                    href ? "hover:bg-slate-50 cursor-pointer" : "cursor-default",
                    !n.read_status && "bg-blue-50/30",
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", categoryColor(n.category))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[13px] font-semibold", n.read_status ? "text-slate-700" : "text-slate-900")}>{n.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {n.category && <Badge variant="info">{n.category}</Badge>}
                        {!n.read_status && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    {href && (
                      <p className="text-[11px] text-farumasi-600 font-medium mt-1 inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Open {href}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
