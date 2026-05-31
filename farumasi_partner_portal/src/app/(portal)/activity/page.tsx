"use client";

import { useState, useEffect } from "react";
import { Activity, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  user?: { id: string; full_name: string; role: string } | null;
  created_at: string;
}

const roleColors: Record<string, string> = {
  partner_company_admin: "bg-farumasi-100 text-farumasi-700",
  pharmacy_admin: "bg-blue-100 text-blue-700",
  pharmacist: "bg-purple-100 text-purple-700",
  super_admin: "bg-amber-100 text-amber-700",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AuditLog[]>("/audit/", { params: { limit: 50 } })
      .then(r => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of all actions performed in your portal"
        icon={Activity}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading activity…
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No activity logs found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {logs.map((log, i) => {
              const actor = log.user?.full_name ?? "System";
              const role = log.user?.role ?? "system";
              const initials = actor.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {initials}
                    </div>
                    {i < logs.length - 1 && (
                      <span className="absolute left-[17px] top-9 bottom-0 w-px bg-border -mb-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{log.action.replace(/_/g, " ")}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleColors[role] ?? "bg-slate-100 text-slate-600"}`}>
                        {actor}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                    )}
                    {log.entity_type && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ""}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{formatDateTime(log.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
