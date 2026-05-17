"use client";

import { mockCommissions } from "@/data/mock";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { Receipt } from "lucide-react";

export default function CommissionsPage() {
  const total = mockCommissions.reduce((a, c) => a + c.amount, 0);
  const pending = mockCommissions.filter(c => c.status === "Pending").length;
  const settled = mockCommissions.filter(c => c.status === "Settled").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" subtitle="Commission records for pharmacies and suppliers" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commissions" value={formatRWF(total)} icon={Receipt} color="text-farumasi-700" />
        <StatCard label="Pending" value={pending} icon={Receipt} color="text-amber-700" />
        <StatCard label="Settled" value={settled} icon={Receipt} color="text-emerald-700" />
        <StatCard label="Total Records" value={mockCommissions.length} icon={Receipt} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-farumasi-600" /><CardTitle>Commission Records</CardTitle></div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Reference</Th>
              <Th>Entity</Th>
              <Th>Type</Th>
              <Th>Rate</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <tbody>
            {mockCommissions.map((c) => (
              <Tr key={c.id}>
                <Td className="text-[11px] font-mono text-slate-500">{c.transactionId}</Td>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{c.entityName}</p>
                    <p className="text-[10px] text-slate-400">{c.entityType}</p>
                  </div>
                </Td>
                <Td><Badge variant="default">{c.entityType}</Badge></Td>
                <Td className="text-[12px] text-slate-600">{c.rate}%</Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(c.amount)}</Td>
                <Td><Badge variant={c.status === "Settled" ? "success" : c.status === "Pending" ? "warning" : "neutral"}>{c.status}</Badge></Td>
                <Td className="text-[12px] text-slate-400">{formatDate(c.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
