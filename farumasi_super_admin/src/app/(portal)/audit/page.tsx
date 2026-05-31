"use client";

import { useEffect, useState } from "react";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, SearchInput } from "@/components/ui";
import { FileText, Activity, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface BackendAuditLog {
  id: string;
  actor_user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  ip_address?: string | null;
  created_at: string;
}

const actionVariant = (a: string) => {
  if (a === "DELETE") return "error";
  if (a === "CREATE") return "success";
  if (a === "UPDATE") return "info";
  if (a === "APPROVE" || a === "VERIFY") return "success";
  if (a === "REJECT" || a === "SUSPEND" || a === "RESTRICT") return "error";
  return "neutral";
};

export default function AuditPage() {
  const [logs, setLogs] = useState<BackendAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ items: BackendAuditLog[]; total: number }>("/audit/", {
        params: { limit: 100, offset: 0 },
      })
      .then((r) => {
        setLogs(r.data.items);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(
    (a) =>
      search === "" ||
      (a.entity_type ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.action).toLowerCase().includes(search.toLowerCase()) ||
      (a.entity_id ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const today = filtered.filter(
    (a) => new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;

  const uniqueActors = new Set(logs.map((a) => a.actor_user_id).filter(Boolean)).size;

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Complete audit trail for all platform actions" breadcrumb="Compliance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={total} icon={FileText} color="text-farumasi-700" />
        <StatCard label="Today" value={today} icon={Activity} color="text-blue-700" />
        <StatCard label="Loaded" value={logs.length} icon={FileText} color="text-green-700" />
        <StatCard label="Unique Actors" value={uniqueActors} icon={Activity} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-farumasi-600" /><CardTitle>Audit Trail</CardTitle></div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Actor ID</Th>
              <Th>Action</Th>
              <Th>Resource</Th>
              <Th>Entity ID</Th>
              <Th>IP Address</Th>
              <Th>Timestamp</Th>
            </tr>
          </Thead>
          <tbody>
            {loading && (
              <Tr>
                <Td colSpan={6} className="text-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-slate-400" />
                  <span className="text-sm text-slate-400">Loading audit logs…</span>
                </Td>
              </Tr>
            )}
            {!loading && filtered.length === 0 && (
              <Tr>
                <Td colSpan={6} className="text-center py-8 text-sm text-slate-400">No audit logs found.</Td>
              </Tr>
            )}
            {!loading && filtered.map((log) => (
              <Tr key={log.id}>
                <Td>
                  <p className="text-[11px] font-mono text-slate-500 truncate max-w-28">
                    {log.actor_user_id?.slice(0, 12) ?? "System"}…
                  </p>
                </Td>
                <Td><Badge variant={actionVariant(log.action) as "error" | "success" | "info" | "warning" | "neutral" | "default"}>{log.action}</Badge></Td>
                <Td><Badge variant="default">{log.entity_type ?? "—"}</Badge></Td>
                <Td className="text-[11px] font-mono text-slate-400 max-w-32 truncate">{log.entity_id ?? "—"}</Td>
                <Td className="text-[11px] font-mono text-slate-400">{log.ip_address ?? "—"}</Td>
                <Td className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(log.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
