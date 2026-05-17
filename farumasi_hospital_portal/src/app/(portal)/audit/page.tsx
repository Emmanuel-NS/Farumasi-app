"use client";

import { useState } from "react";
import { Search, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, Input, Badge, Table, Thead, Th, Td, Tr, EmptyState } from "@/components/ui";
import { mockAuditLogs } from "@/data/mock";
import { severityColor, formatDateTime } from "@/lib/utils";
import type { AuditSeverity } from "@/types";

const SEVERITY_OPTS: (AuditSeverity | "All")[] = ["All", "Info", "Warning", "Critical"];

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<AuditSeverity | "All">("All");

  const filtered = mockAuditLogs.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.actorName.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.resourceLabel.toLowerCase().includes(q);
    const matchSev = severity === "All" || a.severity === severity;
    return matchSearch && matchSev;
  });

  const counts = SEVERITY_OPTS.reduce((acc, s) => {
    acc[s] = s === "All" ? mockAuditLogs.length : mockAuditLogs.filter((a) => a.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Audit Logs" subtitle="Immutable record of all system actions and administrative events" />

      <div className="flex flex-wrap gap-2 items-center">
        <Input icon={Search} placeholder="Search by actor, action, details..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${severity === s ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} events</span>
      </div>

      <Card>
        <Table>
          <Thead>
            <tr><Th>Time</Th><Th>Actor</Th><Th>Role</Th><Th>Action</Th><Th>Details</Th><Th>Severity</Th><Th>IP</Th></tr>
          </Thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={ClipboardList} title="No audit events found" /></td></tr>
            ) : (
              filtered.map((log) => (
                <Tr key={log.id}>
                  <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</Td>
                  <Td className="font-medium text-slate-900 text-sm">{log.actorName}</Td>
                  <Td className="text-slate-500 text-xs">{log.actorRole}</Td>
                  <Td>
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">{log.action}</code>
                  </Td>
                  <Td className="text-xs text-slate-500 max-w-[220px] truncate">{log.resourceLabel}</Td>
                  <Td>
                    <Badge variant={log.severity === "Critical" ? "error" : log.severity === "Warning" ? "warning" : "default"}>
                      {log.severity}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-slate-400 font-mono">{log.ipAddress}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
