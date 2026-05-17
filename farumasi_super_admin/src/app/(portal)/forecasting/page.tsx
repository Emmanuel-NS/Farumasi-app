"use client";

import { mockDemandForecasts } from "@/data/mock";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function ForecastingPage() {
  const risingCount = mockDemandForecasts.filter(f => f.change > 0).length;
  const fallingCount = mockDemandForecasts.filter(f => f.change < 0).length;

  const chartData = mockDemandForecasts.map(f => ({
    name: f.productName.split(" ")[0],
    current: f.currentDemand,
    forecast: f.forecastedDemand,
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Demand Forecasting" subtitle="AI-powered medicine demand predictions" breadcrumb="AI & Insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Forecasted Products" value={mockDemandForecasts.length} icon={BarChart3} color="text-farumasi-700" />
        <StatCard label="Rising Demand" value={risingCount} icon={TrendingUp} color="text-emerald-700" />
        <StatCard label="Falling Demand" value={fallingCount} icon={TrendingDown} color="text-red-700" />
        <StatCard label="Avg. Confidence" value={`${Math.round(mockDemandForecasts.reduce((a, f) => a + f.confidence, 0) / mockDemandForecasts.length)}%`} icon={BarChart3} color="text-blue-700" />
      </div>

      <Card>
        <CardHeader><CardTitle>Demand vs Forecast</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="current" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Current" />
              <Bar dataKey="forecast" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Forecasted" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockDemandForecasts.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">{f.productName}</p>
                <p className="text-[10px] text-slate-400">{f.category} · Confidence: {f.confidence}%</p>
              </div>
              <Badge variant={f.change > 0 ? "success" : f.change < 0 ? "error" : "neutral"}>{f.change > 0 ? "Rising" : f.change < 0 ? "Falling" : "Stable"}</Badge>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] text-slate-500">Current</p>
                <p className="text-lg font-bold text-slate-900">{f.currentDemand.toLocaleString()}</p>
              </div>
              <div className={cn("text-xl", f.change > 0 ? "text-emerald-500" : f.change < 0 ? "text-red-500" : "text-slate-300")}>
                {f.change > 0 ? "→" : f.change < 0 ? "→" : "→"}
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Forecasted</p>
                <p className={cn("text-lg font-bold", f.forecastedDemand > f.currentDemand ? "text-emerald-600" : "text-red-600")}>
                  {f.forecastedDemand.toLocaleString()}
                </p>
              </div>
              <div className={cn("ml-auto text-sm font-bold", f.change >= 0 ? "text-emerald-600" : "text-red-600")}>
                {f.change >= 0 ? "+" : ""}{f.change}%
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{f.period} forecast · {f.region} region</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
