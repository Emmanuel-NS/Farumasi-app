"use client";

import { mockFinanceSummary, mockAnalyticsSeries } from "@/data/mock";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, StatCard } from "@/components/ui";
import { TrendingUp, DollarSign } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, ComposedChart, Line } from "recharts";

export default function FinancialAnalyticsPage() {
  const chartData = mockAnalyticsSeries.slice(0, 30).map(d => ({
    date: d.date.slice(5),
    revenue: Math.round(d.revenue / 1000000),
    commissions: Math.round(d.revenue * 0.08 / 100000),
    orders: d.orders,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Financial Analytics" subtitle="Advanced revenue analysis and financial health metrics" breadcrumb="Finance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatRWF(mockFinanceSummary.totalRevenue)} icon={DollarSign} color="text-farumasi-700" />
        <StatCard label="Commission Earned" value={formatRWF(mockFinanceSummary.commissionEarned)} icon={DollarSign} color="text-blue-700" />
        <StatCard label="Pending Payouts" value={formatRWF(mockFinanceSummary.pendingPayouts)} icon={DollarSign} color="text-amber-700" />
        <StatCard label="Processed Payouts" value={formatRWF(mockFinanceSummary.processedPayouts)} icon={TrendingUp} color="text-emerald-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Revenue vs Commissions (30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar yAxisId="left" dataKey="revenue" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Revenue (M)" />
                <Line yAxisId="right" type="monotone" dataKey="commissions" stroke="#6366f1" strokeWidth={2} dot={false} name="Commissions (100K)" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Commission Earned", value: mockFinanceSummary.commissionEarned, total: mockFinanceSummary.totalRevenue, color: "bg-emerald-500" },
                { label: "Pending Payouts", value: mockFinanceSummary.pendingPayouts, total: mockFinanceSummary.totalRevenue, color: "bg-amber-500" },
                { label: "Processed Payouts", value: mockFinanceSummary.processedPayouts, total: mockFinanceSummary.totalRevenue, color: "bg-blue-500" },
                { label: "Disputed Amount", value: mockFinanceSummary.disputedAmount, total: mockFinanceSummary.totalRevenue, color: "bg-red-500" },
              ].map((item) => {
                const pct = Math.round((item.value / item.total) * 100);
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
    </div>
  );
}
