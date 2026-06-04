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
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  actor_user_id?: string | null;
  created_at: string;
}

interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  offset: number;
  limit: number;
}

function formatDetails(log: AuditLog): string | null {
  if (log.new_value && typeof log.new_value === "object") {
    const nv = log.new_value as Record<string, unknown>;
    const parts = Object.entries(nv).map(([k, v]) => `${k}: ${String(v)}`);
    if (parts.length) return parts.join(", ");
  }
  if (log.entity_type && log.entity_id) {
    return `${log.entity_type} ${log.entity_id.slice(0, 8)}…`;
  }
  return null;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedAuditLogs>("/audit/", { params: { limit: 50 } })
      .then(r => setLogs(r.data.items ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Activity Logs"
        description="Audit trail of actions you performed in your portal"
        icon={Activity}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading activity…
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No activity logs found yet. Actions like listing updates and order status changes will appear here.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {logs.map((log, i) => {
              const details = formatDetails(log);
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-farumasi-100 flex items-center justify-center text-xs font-bold text-farumasi-700 shrink-0">
                      {log.action.slice(0, 2).toUpperCase()}
                    </div>
                    {i < logs.length - 1 && (
                      <span className="absolute left-[17px] top-9 bottom-0 w-px bg-border -mb-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {log.action.replace(/\./g, " · ").replace(/_/g, " ")}
                      </span>
                    </div>
                    {details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{details}</p>
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
