"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { Receipt, Loader2 } from "lucide-react";

interface RevenueRecord {
  id: string;
  order_id: string;
  partner_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
  pharmacy?: { id: string; name: string } | null;
  partner_company?: { id: string; name: string } | null;
}

export default function CommissionsPage() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<RevenueRecord[]>("/revenue/", { params: { limit: 100 } })
      .then(r => setRecords(r.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const total = records.reduce((a, c) => a + c.platform_commission, 0);
  const pending = records.filter(c => c.status === "pending").length;
  const settled = records.filter(c => c.status === "settled" || c.status === "completed").length;

  return (
    <div className="space-y-5">
      <PageHeader title="Commissions" subtitle="Platform commission records" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commission" value={formatRWF(total)} icon={Receipt} color="text-farumasi-700" />
        <StatCard label="Pending" value={pending} icon={Receipt} color="text-amber-700" />
        <StatCard label="Settled" value={settled} icon={Receipt} color="text-emerald-700" />
        <StatCard label="Total Records" value={records.length} icon={Receipt} color="text-slate-700" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading commissions…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-farumasi-600" /><CardTitle>Commission Records</CardTitle></div>
          </CardHeader>
          <Table>
            <Thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Entity</Th>
                <Th>Type</Th>
                <Th>Gross</Th>
                <Th>Commission</Th>
                <Th>Net</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <tbody>
              {records.length === 0 ? (
                <Tr><Td colSpan={8} className="text-center text-sm text-slate-400 py-8">No commission records found.</Td></Tr>
              ) : records.map(c => (
                <Tr key={c.id}>
                  <Td className="text-[11px] font-mono text-slate-500">{c.order_id.slice(0, 8)}…</Td>
                  <Td className="text-[12px] font-semibold text-slate-900">
                    {c.pharmacy?.name ?? c.partner_company?.name ?? c.partner_type ?? "—"}
                  </Td>
                  <Td><Badge variant="default">{c.partner_type ?? "—"}</Badge></Td>
                  <Td className="text-[12px] text-slate-600">{formatRWF(c.gross_amount)}</Td>
                  <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(c.platform_commission)}</Td>
                  <Td className="text-[12px] text-emerald-700 font-semibold">{formatRWF(c.net_amount)}</Td>
                  <Td><Badge variant={c.status === "completed" || c.status === "settled" ? "success" : c.status === "pending" ? "warning" : "neutral"}>{c.status}</Badge></Td>
                  <Td className="text-[12px] text-slate-400">{formatDate(c.created_at)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
