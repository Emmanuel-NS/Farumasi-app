"use client";

import { useEffect, useState } from "react";
import { formatRWF, formatDate } from "@/lib/utils";
import { getApiError } from "@/lib/services/auth.service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  PageHeader,
  Badge,
  Table,
  Thead,
  Th,
  Td,
  Tr,
  StatCard,
  EmptyState,
  ErrorBanner,
} from "@/components/ui";
import { DollarSign, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { SafeChartContainer } from "@/components/charts/SafeChartContainer";
import { revenueService, type RevenueSummary } from "@/lib/services/revenue.service";
import type { RevenueRecord } from "@/types";

export default function FinanceRevenuePage() {
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    Promise.all([
      revenueService.getRevenue({ limit: 100 }),
      revenueService.getSummary(),
    ])
      .then(([rec, sum]) => {
        setRecords(rec);
        setSummary(sum);
      })
      .catch((err) => setError(getApiError(err, "Failed to load revenue data")));
  };

  useEffect(() => {
    load();
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

  return (
    <div className="space-y-5">
      <PageHeader title="Revenue" subtitle="Gross volume, platform commission and settlement ledger" breadcrumb="Finance" />

      {error && <ErrorBanner message={error} onRetry={load} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={formatRWF(summary?.total_gross ?? 0)} icon={DollarSign} color="text-farumasi-700" />
        <StatCard label="Commission" value={formatRWF(summary?.total_commission ?? 0)} icon={TrendingUp} color="text-blue-700" />
        <StatCard label="Net earnings (partners)" value={formatRWF(summary?.total_net ?? 0)} icon={TrendingUp} color="text-emerald-700" />
        <StatCard
          label="Pending settlements"
          value={summary?.pending_settlement_count ?? 0}
          icon={DollarSign}
          color="text-amber-700"
          sublabel={`${summary?.available_settlement_count ?? 0} available · ${summary?.withdrawn_settlement_count ?? 0} withdrawn`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend (K RWF)</CardTitle>
        </CardHeader>
        <CardContent>
          <SafeChartContainer height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#1e9e68"
                strokeWidth={2}
                fill="url(#finRevGrad)"
                name="Revenue (K RWF)"
                isAnimationActive={false}
              />
            </AreaChart>
          </SafeChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction ledger</CardTitle>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Record</Th>
              <Th>Order / source</Th>
              <Th>Commission</Th>
              <Th>Gross</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <tbody>
            {records.length === 0 ? (
              <Tr>
                <Td colSpan={6}>
                  <EmptyState icon={DollarSign} title="No revenue records" description="Completed orders generate ledger entries here." />
                </Td>
              </Tr>
            ) : (
              records.map((r) => (
              <Tr key={r.id}>
                <Td className="text-[11px] font-mono text-slate-500">{r.id.slice(0, 8)}…</Td>
                <Td className="text-[12px] text-slate-700">{r.source}</Td>
                <Td className="text-[12px] text-slate-600">{formatRWF(r.commission)}</Td>
                <Td className="text-[12px] font-semibold text-farumasi-700">{formatRWF(r.amount)}</Td>
                <Td>
                  <Badge variant={r.status === "Settled" ? "success" : "warning"}>{r.status}</Badge>
                </Td>
                <Td className="text-[12px] text-slate-400">{formatDate(r.date)}</Td>
              </Tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
