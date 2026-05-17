"use client";

import { mockSecurityEvents } from "@/data/mock";
import { formatDate, timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, Button } from "@/components/ui";
import { Shield, AlertTriangle, CheckCircle2, Eye } from "lucide-react";

export default function SecurityPage() {
  const open = mockSecurityEvents.filter(e => e.status === "Open").length;
  const investigating = mockSecurityEvents.filter(e => e.status === "Investigating").length;
  const high = mockSecurityEvents.filter(e => e.severity === "High" || e.severity === "Critical").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Security Events" subtitle="Security monitoring and threat detection" breadcrumb="Compliance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Open Events" value={open} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Investigating" value={investigating} icon={Eye} color="text-amber-700" />
        <StatCard label="High/Critical" value={high} icon={Shield} color="text-red-700" />
        <StatCard label="Total Events" value={mockSecurityEvents.length} icon={Shield} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-farumasi-600" /><CardTitle>Security Event Log</CardTitle></div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Event Type</Th>
              <Th>Description</Th>
              <Th>Severity</Th>
              <Th>Status</Th>
              <Th>IP Address</Th>
              <Th>Actor</Th>
              <Th>Detected</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {mockSecurityEvents.map((e) => (
              <Tr key={e.id}>
                <Td><Badge variant="default">{e.type}</Badge></Td>
                <Td className="text-[12px] text-slate-700 max-w-48 truncate">{e.description}</Td>
                <Td>
                  <Badge variant={e.severity === "Critical" ? "error" : e.severity === "High" ? "warning" : e.severity === "Medium" ? "info" : "neutral"}>{e.severity}</Badge>
                </Td>
                <Td>
                  <Badge variant={e.status === "Resolved" ? "success" : e.status === "Open" ? "error" : "warning"}>{e.status}</Badge>
                </Td>
                <Td className="text-[11px] font-mono text-slate-400">{e.ipAddress}</Td>
                <Td className="text-[12px] text-slate-600">{e.userName ?? "—"}</Td>
                <Td className="text-[11px] text-slate-400">{timeAgo(e.createdAt)}</Td>
                <Td>
                  {e.status === "Open" && (
                    <Button variant="outline" size="xs">Investigate</Button>
                  )}
                  {e.status === "Investigating" && (
                    <Button variant="success" size="xs"><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
