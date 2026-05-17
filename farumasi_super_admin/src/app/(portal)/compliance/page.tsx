"use client";

import { mockComplianceRecords } from "@/data/mock";
import { formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { ComplianceStatus } from "@/types";

export default function CompliancePage() {
  const compliant = mockComplianceRecords.filter(c => c.status === "Compliant").length;
  const nonCompliant = mockComplianceRecords.filter(c => c.status === "Non-Compliant").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Compliance Monitoring" subtitle="Entity compliance status and regulatory score tracking" breadcrumb="Compliance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compliant" value={compliant} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Non-Compliant" value={nonCompliant} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Pending" value={mockComplianceRecords.filter(c => c.status === "Pending").length} icon={ShieldCheck} color="text-amber-700" />
        <StatCard label="Total Records" value={mockComplianceRecords.length} icon={ShieldCheck} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-farumasi-600" /><CardTitle>Compliance Records</CardTitle></div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Entity</Th>
              <Th>Type</Th>
              <Th>Check Type</Th>
              <Th>Status</Th>
              <Th>Due Date</Th>
              <Th>Completed</Th>
              <Th>Verified By</Th>
            </tr>
          </Thead>
          <tbody>
            {mockComplianceRecords.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="text-[12px] font-semibold text-slate-900">{c.entityName}</p>
                </Td>
                <Td><Badge variant="default">{c.entityType}</Badge></Td>
                <Td className="text-[12px] text-slate-600">{c.checkType}</Td>
                <Td>
                  <Badge variant={c.status === "Compliant" ? "success" : c.status === "Non-Compliant" ? "error" : c.status === "Expired" ? "error" : "warning"}>{c.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(c.dueDate)}</Td>
                <Td className="text-[12px] text-slate-400">{c.completedAt ? formatDate(c.completedAt) : "—"}</Td>
                <Td className="text-[12px] text-slate-500">{c.verifiedBy ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
