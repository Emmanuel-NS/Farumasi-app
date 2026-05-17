"use client";

import { useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mockNotifications } from "@/data/mock";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const categoryColors: Record<string, string> = {
  order: "bg-blue-100 text-blue-700",
  inventory: "bg-amber-100 text-amber-700",
  withdrawal: "bg-green-100 text-green-700",
  approval: "bg-purple-100 text-purple-700",
  system: "bg-slate-100 text-slate-600",
};

export default function NotificationsPage() {
  const [readIds, setReadIds] = useState<Set<string>>(
    new Set(mockNotifications.filter(n => n.isRead).map(n => n.id))
  );

  const markRead = (id: string) => setReadIds(prev => new Set([...prev, id]));
  const markAllRead = () => {
    setReadIds(new Set(mockNotifications.map(n => n.id)));
    toast.success("All notifications marked as read");
  };

  const unreadCount = mockNotifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Stay updated on orders, inventory, and platform alerts"
        icon={Bell}
        actions={
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </Button>
        }
      />

      {unreadCount > 0 && (
        <div className="text-xs text-muted-foreground">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</div>
      )}

      <Card>
        <CardContent className="p-0 divide-y">
          {mockNotifications.map(n => {
            const isUnread = !readIds.has(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer",
                  isUnread && "bg-farumasi-50/40"
                )}
                onClick={() => markRead(n.id)}
              >
                <span className={cn("mt-1 w-2 h-2 rounded-full shrink-0", isUnread ? "bg-farumasi-500" : "bg-slate-200")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mr-2 capitalize", categoryColors[n.category])}>
                        {n.category}
                      </span>
                      <span className={cn("text-sm font-semibold", isUnread ? "text-foreground" : "text-muted-foreground")}>
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(n.timestamp)}</span>
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
