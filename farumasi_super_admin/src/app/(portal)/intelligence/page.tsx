"use client";

import { mockKPIs, mockFulfillments, mockOrders, mockAnalyticsSeries } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar, StatCard } from "@/components/ui";
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Brain } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Bar, Line } from "recharts";

export default function IntelligencePage() {
  const chartData = mockAnalyticsSeries.slice(0, 30).map((d) => ({
    date: d.date.slice(5),
    orders: d.orders,
    fulfilled: d.fulfillments,
  }));

  const failedCount = mockFulfillments.filter(f => f.status === "Failed").length;
  const partialCount = mockFulfillments.filter(f => f.status === "Partially Fulfilled").length;
  const completedCount = mockFulfillments.filter(f => f.status === "Fulfilled").length;

  const bottlenecks = [
    { issue: "Medicine Shortage", count: mockKPIs.medicineShortages, severity: "Critical", description: "Active shortage incidents across pharmacies" },
    { issue: "Low Stock Alerts", count: mockKPIs.lowStockAlerts, severity: "High", description: "Products below reorder threshold" },
    { issue: "Failed Fulfillments", count: failedCount, severity: "High", description: "Orders unable to be filled" },
    { issue: "Partial Fulfillments", count: partialCount, severity: "Medium", description: "Orders partially filled — pending stock" },
    { issue: "Pending Payouts", count: mockKPIs.pendingPayouts, severity: "Medium", description: "Rider and supplier payments queued" },
    { issue: "Open Complaints", count: mockKPIs.openComplaints, severity: "Low", description: "Unresolved escalations" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Executive</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Operational Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">Fulfillment analytics, bottleneck detection, and operational performance intelligence.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Fulfillment Rate" value={`${mockKPIs.fulfillmentRate}%`} icon={CheckCircle2} color="text-emerald-700" />
        <StatCard label="Failed Fulfillments" value={`${mockKPIs.failedFulfillment}%`} icon={AlertCircle} color="text-red-700" />
        <StatCard label="Medicine Shortages" value={mockKPIs.medicineShortages} icon={AlertCircle} color="text-amber-700" />
        <StatCard label="Low Stock Alerts" value={mockKPIs.lowStockAlerts} icon={TrendingUp} color="text-orange-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-farumasi-600" />
              <CardTitle>Fulfillment Rate Trend</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar yAxisId="left" dataKey="orders" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Orders" />
                <Bar yAxisId="left" dataKey="fulfilled" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Fulfilled" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Fulfillment Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Completed", value: completedCount, total: mockFulfillments.length, color: "bg-emerald-500" },
                { label: "Partial", value: partialCount, total: mockFulfillments.length, color: "bg-amber-500" },
                { label: "Failed", value: failedCount, total: mockFulfillments.length, color: "bg-red-500" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold text-slate-700">{item.label}</p>
                    <p className="text-[12px] font-bold text-slate-900">{item.value} <span className="text-slate-400 font-normal text-[10px]">/ {item.total}</span></p>
                  </div>
                  <ProgressBar value={item.value} max={item.total} color={item.color} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Detected Bottlenecks</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {bottlenecks.map((b) => (
              <div key={b.issue} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[13px] font-semibold text-slate-900">{b.issue}</p>
                  <Badge variant={b.severity === "Critical" ? "error" : b.severity === "High" ? "warning" : b.severity === "Medium" ? "info" : "neutral"}>{b.severity}</Badge>
                </div>
                <p className="text-2xl font-bold text-slate-900 my-2">{b.count}</p>
                <p className="text-[11px] text-slate-400">{b.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
