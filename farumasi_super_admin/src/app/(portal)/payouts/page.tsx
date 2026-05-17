"use client";

import { mockWithdrawals } from "@/data/mock";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard, Button } from "@/components/ui";
import { CreditCard, CheckCircle2 } from "lucide-react";

export default function PayoutsPage() {
  const approved = mockWithdrawals.filter(w => w.status === "Approved");
  const total = approved.reduce((a, w) => a + w.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Payouts" subtitle="Approved withdrawals ready for processing" breadcrumb="Finance">
        <Badge variant="info">{approved.length} Ready</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ready for Payout" value={approved.length} icon={CreditCard} color="text-blue-700" />
        <StatCard label="Payout Amount" value={formatRWF(total)} icon={CreditCard} color="text-farumasi-700" />
        <StatCard label="Processing" value={mockWithdrawals.filter(w => w.status === "Under Review").length} icon={CreditCard} color="text-amber-700" />
        <StatCard label="Completed" value={mockWithdrawals.filter(w => w.status === "Processed").length} icon={CheckCircle2} color="text-emerald-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-farumasi-600" /><CardTitle>Payout Queue</CardTitle></div>
          <Button variant="primary" size="sm">Process All Approved</Button>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Entity</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Processed At</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {mockWithdrawals.filter(w => ["Approved", "Processed"].includes(w.status)).map((w) => (
              <Tr key={w.id}>
                <Td>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-900">{w.entityName}</p>
                    <p className="text-[10px] text-slate-400">{w.entityType}</p>
                  </div>
                </Td>
                <Td><Badge variant="default">{w.method}</Badge></Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(w.amount)}</Td>
                <Td>
                  <Badge variant={w.status === "Processed" ? "success" : "info"}>{w.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{w.processedAt ? formatDate(w.processedAt) : "—"}</Td>
                <Td>
                  {w.status === "Approved" && (
                    <Button variant="success" size="xs"><CheckCircle2 className="w-3.5 h-3.5" /> Process</Button>
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
