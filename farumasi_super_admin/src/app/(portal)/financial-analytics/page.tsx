"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, StatCard } from "@/components/ui";
import { TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { SafeChartContainer } from "@/components/charts/SafeChartContainer";

interface RevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  available_balance: number;
  pending_balance: number;
  withdrawn_total: number;
}

interface RevenueRecord {
  id: string;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export default function FinancialAnalyticsPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<RevenueSummary>("/revenue/summary"),
      api.get<RevenueRecord[]>("/revenue/", { params: { limit: 200 } }),
    ])
      .then(([s, r]) => { setSummary(s.data); setRecords(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group by month for chart
  const chartData = (() => {
    const grouped: Record<string, { date: string; revenue: number; commissions: number; orders: number }> = {};
    records.forEach(r => {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { date: key.slice(5), revenue: 0, commissions: 0, orders: 0 };
      grouped[key].revenue += Math.round(r.gross_amount / 1000);
      grouped[key].commissions += Math.round(r.platform_commission / 1000);
      grouped[key].orders++;
    });
    return Object.values(grouped).slice(-12);
  })();

  const breakdownItems = summary ? [
    { label: "Total Gross Revenue", value: summary.total_gross, color: "bg-emerald-500" },
    { label: "Platform Commission", value: summary.total_commission, color: "bg-blue-500" },
    { label: "Net Revenue (Partners)", value: summary.total_net, color: "bg-indigo-500" },
    { label: "Available Balance", value: summary.available_balance, color: "bg-teal-500" },
    { label: "Pending Balance", value: summary.pending_balance, color: "bg-amber-500" },
    { label: "Total Withdrawn", value: summary.withdrawn_total, color: "bg-slate-400" },
  ] : [];

  return (
    <div className="space-y-5">
      <PageHeader title="Financial Analytics" subtitle="Revenue analysis and financial health metrics" breadcrumb="Finance" />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading financial data…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={formatRWF(summary?.total_gross ?? 0)} icon={DollarSign} color="text-farumasi-700" />
            <StatCard label="Commission Earned" value={formatRWF(summary?.total_commission ?? 0)} icon={DollarSign} color="text-blue-700" />
            <StatCard label="Available Balance" value={formatRWF(summary?.available_balance ?? 0)} icon={DollarSign} color="text-emerald-700" />
            <StatCard label="Total Withdrawn" value={formatRWF(summary?.withdrawn_total ?? 0)} icon={TrendingUp} color="text-amber-700" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Revenue vs Commission (Monthly)</CardTitle></CardHeader>
              <CardContent>
                <SafeChartContainer height={220}>
                  <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Revenue (K RWF)" isAnimationActive={false} />
                    <Line type="monotone" dataKey="commissions" stroke="#6366f1" strokeWidth={2} dot={false} name="Commission (K RWF)" isAnimationActive={false} />
                  </ComposedChart>
                </SafeChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {breakdownItems.map(item => {
                    const pct = summary && summary.total_gross > 0 ? Math.round((item.value / summary.total_gross) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-semibold text-slate-700">{item.label}</p>
                          <p className="text-[12px] font-bold text-slate-900">{pct}% <span className="font-normal text-slate-400 text-[10px]">{formatRWF(item.value)}</span></p>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
