"use client";

import { mockNotifications } from "@/data/mock";
import { timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Bell, CheckCircle2 } from "lucide-react";

export default function NotificationsPage() {
  const unread = mockNotifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle="System notifications and platform alerts" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={mockNotifications.length} icon={Bell} color="text-farumasi-700" />
        <StatCard label="Unread" value={unread} icon={Bell} color="text-red-700" />
        <StatCard label="Read" value={mockNotifications.length - unread} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Critical" value={mockNotifications.filter(n => n.type === "Critical").length} icon={Bell} color="text-red-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-farumasi-600" /><CardTitle>All Notifications</CardTitle></div>
          {unread > 0 && <Badge variant="error">{unread} unread</Badge>}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {mockNotifications.map((n) => (
              <div key={n.id} className={cn("flex items-start gap-3 px-5 py-4", !n.isRead && "bg-blue-50/30")}>
                <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0",
                  n.type === "Critical" ? "bg-red-500" :
                  n.type === "Warning" ? "bg-amber-500" :
                  n.type === "Success" ? "bg-emerald-500" : "bg-blue-500"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-[13px] font-semibold", n.isRead ? "text-slate-700" : "text-slate-900")}>{n.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={n.type === "Critical" ? "error" : n.type === "Warning" ? "warning" : n.type === "Success" ? "success" : "info"}>{n.type}</Badge>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
