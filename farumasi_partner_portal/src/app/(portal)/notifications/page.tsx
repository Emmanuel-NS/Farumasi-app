"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { timeAgo, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getApiError } from "@/lib/api";
import { notificationsService, type BackendNotification } from "@/lib/services/notifications.service";

const categoryColors: Record<string, string> = {
  order: "bg-blue-100 text-blue-700",
  inventory: "bg-amber-100 text-amber-700",
  withdrawal: "bg-green-100 text-green-700",
  approval: "bg-purple-100 text-purple-700",
  compliance: "bg-rose-100 text-rose-700",
  system: "bg-slate-100 text-slate-600",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<BackendNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationsService.list({ offset: 0, limit: 100 });
      setItems(res.items);
    } catch (err: unknown) {
      toast.error(getApiError(err, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    try {
      const updated = await notificationsService.markRead(id);
      setItems(prev => prev.map(n => n.id === id ? updated : n));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await notificationsService.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, read_status: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setBusy(false);
    }
  };

  const unreadCount = items.filter(n => !n.read_status).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Stay updated on orders, inventory, and platform alerts"
        icon={Bell}
        actions={
          <Button variant="outline" size="sm" className="text-xs gap-1.5" disabled={busy || unreadCount === 0} onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        }
      />

      {!loading && unreadCount > 0 && (
        <div className="text-xs text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</div>
      )}

      <Card>
        <CardContent className="p-0 divide-y">
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          )}
          {!loading && items.map(n => {
            const isUnread = !n.read_status;
            const cat = n.category || "system";
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer",
                  isUnread && "bg-farumasi-50/40"
                )}
                onClick={() => isUnread && markRead(n.id)}
              >
                <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", isUnread ? "bg-farumasi-500" : "bg-slate-200")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-2 capitalize", categoryColors[cat] || categoryColors.system)}>
                        {cat}
                      </span>
                      <span className={cn("text-sm font-semibold", isUnread ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                </div>
                {isUnread && (
                  <Button variant="ghost" size="icon-sm" className="shrink-0 mt-0.5" onClick={e => { e.stopPropagation(); markRead(n.id); }}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
