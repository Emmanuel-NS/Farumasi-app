"use client";

import { useEffect, useState } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { DollarSign, TrendingUp, Truck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { revenueService, type RevenueSummary } from "@/lib/services/revenue.service";
import type { RevenueRecord } from "@/types";

const sourceTypeBadge = (type: string) => {
  if (type === "Delivery Fee") return "info";
  if (type === "Order") return "success";
  if (type === "Commission") return "warning";
  if (type === "Subscription") return "default";
  return "neutral";
};

export default function RevenuePage() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);

  useEffect(() => {
    revenueService.getRevenue({ limit: 100 }).then(setRecords).catch(() => {});
    revenueService.getSummary().then(setSummary).catch(() => {});
  }, []);

  const chartData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    records.forEach((r) => {
      const key = r.date.slice(0, 7);
      if (key in months) months[key] = (months[key] ?? 0) + r.amount;
    });
    return Object.entries(months).map(([m, v]) => ({
      date: m.slice(5),
      revenue: Math.round(v / 1000),
    }));
  })();

  const deliveryFeeTotal = records
    .filter(r => r.sourceType === "Delivery Fee")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Revenue Management" subtitle="Platform revenue streams and transaction records" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Revenue" value={formatRWF(summary?.total_gross ?? 0)} icon={DollarSign} color="text-farumasi-700" />
        <StatCard label="Commission Earned" value={formatRWF(summary?.total_commission ?? 0)} icon={TrendingUp} color="text-blue-700" />
        <StatCard label="Net Revenue" value={formatRWF(summary?.total_net ?? 0)} icon={TrendingUp} color="text-emerald-700" />
        <StatCard label="Delivery Fees" value={formatRWF(deliveryFeeTotal)} icon={Truck} color="text-teal-700" />
        <StatCard label="Pending Records" value={summary?.pending_count ?? 0} icon={DollarSign} color="text-amber-700" />
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Trend (M RWF)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="revenue" stroke="#1e9e68" strokeWidth={2} fill="url(#revGrad)" name="Revenue (M)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Revenue Records</CardTitle></CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Source</Th>
              <Th>Source Type</Th>
              <Th>Commission</Th>
              <Th>Amount</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <tbody>
            {records.map((r) => (
              <Tr key={r.id}>
                <Td className="text-[11px] font-mono text-slate-500">{r.id}</Td>
                <Td className="text-[12px] text-slate-700">{r.source}</Td>
                <Td><Badge variant={sourceTypeBadge(r.sourceType) as "default"}>{r.sourceType}</Badge></Td>
                <Td className="text-[12px] text-slate-600">{formatRWF(r.commission)}</Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(r.amount)}</Td>
                <Td className="text-[12px] text-slate-400">{formatDate(r.date)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
