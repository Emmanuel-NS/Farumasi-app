"use client";

import { mockFinanceSummary, mockAnalyticsSeries, mockRevenue } from "@/data/mock";
import { formatRWF } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, StatCard, Badge } from "@/components/ui";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#1e9e68", "#6366f1", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

export default function BIPage() {
  const chartData = mockAnalyticsSeries.slice(0, 30).map((d) => ({
    date: d.date.slice(5),
    revenue: Math.round(d.revenue / 1000000),
    commissions: Math.round(d.revenue * 0.08 / 100000),
  }));

  const pieData = [
    { name: "Order Revenue", value: Math.round(mockFinanceSummary.totalRevenue * 0.45) },
    { name: "Commission Revenue", value: mockFinanceSummary.commissionEarned },
    { name: "Subscription Revenue", value: Math.round(mockFinanceSummary.totalRevenue * 0.12) },
    { name: "Service Fees", value: Math.round(mockFinanceSummary.totalRevenue * 0.08) },
    { name: "Delivery Revenue", value: Math.round(mockFinanceSummary.totalRevenue * 0.05) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Executive</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Business Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Revenue analytics, growth metrics, and financial health intelligence.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatRWF(mockFinanceSummary.totalRevenue)} icon={DollarSign} color="text-farumasi-700" sublabel="Lifetime" />
        <StatCard label="MoM Growth" value={`${mockFinanceSummary.revenueGrowth}%`} icon={TrendingUp} color="text-emerald-700" />
        <StatCard label="Commission Earned" value={formatRWF(mockFinanceSummary.commissionEarned)} icon={TrendingUp} color="text-blue-700" />
        <StatCard label="Pending Payouts" value={formatRWF(mockFinanceSummary.pendingPayouts)} icon={TrendingDown} color="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Revenue Trend (M RWF)</CardTitle>
            </div>
            <Badge variant="success">30 Days</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="#1e9e68" strokeWidth={2} fill="url(#gradRev)" name="Revenue (M)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue Mix</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v) => [formatRWF(Number(v)), ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <p className="text-[10px] text-slate-500 truncate flex-1">{item.name}</p>
                  <p className="text-[10px] font-semibold text-slate-700 shrink-0">{formatRWF(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue Streams Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {pieData.map((item, i) => (
              <div key={item.name} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: COLORS[i] }} />
                <p className="text-[10px] text-slate-500 font-semibold">{item.name}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatRWF(item.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
