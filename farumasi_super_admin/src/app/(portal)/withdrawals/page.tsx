"use client";

import { useState, useEffect, useCallback } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, FilterTabs, StatCard, Button } from "@/components/ui";
import { ArrowDownToLine, CheckCircle2, XCircle } from "lucide-react";
import { WithdrawalStatus, WithdrawalRequest } from "@/types";
import { withdrawalsService } from "@/lib/services/withdrawals.service";

const STATUS_FILTERS: (WithdrawalStatus | "All")[] = ["All", "Pending", "Under Review", "Approved", "Processed", "Rejected"];

export default function WithdrawalsPage() {
  const [status, setStatus] = useState<WithdrawalStatus | "All">("All");
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);

  const load = useCallback(() => {
    withdrawalsService.getWithdrawals().then(setAllWithdrawals).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = allWithdrawals.filter(w => w.status === "Pending");
  const filtered = status === "All" ? allWithdrawals : allWithdrawals.filter(w => w.status === status);

  async function handleApprove(id: string) {
    await withdrawalsService.approve(id).catch(() => {});
    load();
  }
  async function handleReject(id: string) {
    await withdrawalsService.reject(id).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Withdrawals" subtitle={`${pending.length} pending approval`} breadcrumb="Finance">
        <Badge variant="warning">{pending.length} Pending</Badge>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={pending.length} icon={ArrowDownToLine} color="text-amber-700" />
        <StatCard label="Pending Amount" value={formatRWF(pending.reduce((a, w) => a + w.amount, 0))} icon={ArrowDownToLine} color="text-amber-700" />
        <StatCard label="Completed" value={allWithdrawals.filter(w => w.status === "Processed").length} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Total Records" value={allWithdrawals.length} icon={ArrowDownToLine} color="text-slate-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ArrowDownToLine className="w-4 h-4 text-farumasi-600" /><CardTitle>Withdrawal Requests</CardTitle></div>
          <FilterTabs options={STATUS_FILTERS} value={status} onChange={setStatus} />
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Requester</Th>
              <Th>Method</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map((w) => (
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
                  <Badge variant={w.status === "Processed" ? "success" : w.status === "Pending" ? "warning" : w.status === "Approved" || w.status === "Under Review" ? "info" : "error"}>
                    {w.status}
                  </Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(w.requestedAt)}</Td>
                <Td>
                  {w.status === "Pending" && (
                    <div className="flex items-center gap-1">
                      <Button variant="success" size="xs" onClick={() => handleApprove(w.id)}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>
                      <Button variant="destructive" size="xs" onClick={() => handleReject(w.id)}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                    </div>
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
