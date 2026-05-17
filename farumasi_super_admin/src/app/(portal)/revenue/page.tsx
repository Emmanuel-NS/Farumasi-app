"use client";

import { mockRevenue, mockFinanceSummary, mockAnalyticsSeries } from "@/data/mock";
import { formatRWF, formatDate } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, Table, Thead, Th, Td, Tr, StatCard } from "@/components/ui";
import { DollarSign, TrendingUp, Truck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const sourceTypeBadge = (type: string) => {
  if (type === "Delivery Fee") return "info";
  if (type === "Order") return "success";
  if (type === "Commission") return "warning";
  if (type === "Subscription") return "default";
  return "neutral";
};

export default function RevenuePage() {
  const chartData = mockAnalyticsSeries.slice(0, 30).map(d => ({
    date: d.date.slice(5),
    revenue: Math.round(d.revenue / 1000000),
  }));

  const deliveryFeeTotal = mockRevenue
    .filter(r => r.sourceType === "Delivery Fee")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Revenue Management" subtitle="Platform revenue streams and transaction records" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Revenue" value={formatRWF(mockFinanceSummary.totalRevenue)} icon={DollarSign} color="text-farumasi-700" />
        <StatCard label="Revenue Growth" value={`${mockFinanceSummary.revenueGrowth}%`} icon={TrendingUp} color="text-emerald-700" />
        <StatCard label="Commission Earned" value={formatRWF(mockFinanceSummary.commissionEarned)} icon={TrendingUp} color="text-blue-700" />
        <StatCard label="Delivery Fees" value={formatRWF(deliveryFeeTotal)} icon={Truck} color="text-teal-700" />
        <StatCard label="Pending Payouts" value={formatRWF(mockFinanceSummary.pendingPayouts)} icon={DollarSign} color="text-amber-700" />
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
            {mockRevenue.map((r) => (
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
