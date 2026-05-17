"use client";

import { mockAuditLogs } from "@/data/mock";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, SearchInput } from "@/components/ui";
import { FileText, Activity } from "lucide-react";
import { useState } from "react";
import { AuditAction } from "@/types";

const actionVariant = (a: AuditAction) => {
  if (a === "DELETE") return "error";
  if (a === "CREATE") return "success";
  if (a === "UPDATE") return "info";
  if (a === "APPROVE" || a === "VERIFY") return "success";
  if (a === "REJECT" || a === "SUSPEND" || a === "RESTRICT") return "error";
  return "neutral";
};

export default function AuditPage() {
  const [search, setSearch] = useState("");

  const filtered = mockAuditLogs.filter(a =>
    search === "" || a.actorName.toLowerCase().includes(search.toLowerCase()) || a.resourceLabel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Complete audit trail for all platform actions" breadcrumb="Compliance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={mockAuditLogs.length} icon={FileText} color="text-farumasi-700" />
        <StatCard label="Today" value={mockAuditLogs.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length} icon={Activity} color="text-blue-700" />
        <StatCard label="High Risk" value={0} icon={FileText} color="text-red-700" />
        <StatCard label="Unique Actors" value={new Set(mockAuditLogs.map(a => a.actorId)).size} icon={Activity} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-farumasi-600" /><CardTitle>Audit Trail</CardTitle></div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="w-56" />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Actor</Th>
              <Th>Action</Th>
              <Th>Resource</Th>
              <Th>Details</Th>
              <Th>IP Address</Th>
              <Th>Risk</Th>
              <Th>Timestamp</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((log) => (
              <Tr key={log.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{log.actorName}</p>
                    <p className="text-[10px] text-slate-400">{log.actorRole}</p>
                  </div>
                </Td>
                <Td><Badge variant={actionVariant(log.action)}>{log.action}</Badge></Td>
                <Td><Badge variant="default">{log.resourceType}</Badge></Td>
                <Td className="text-[11px] text-slate-500 max-w-40 truncate">{log.details}</Td>
                <Td className="text-[11px] font-mono text-slate-400">{log.ipAddress}</Td>
                <Td><Badge variant="neutral">Normal</Badge></Td>
                <Td className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(log.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
