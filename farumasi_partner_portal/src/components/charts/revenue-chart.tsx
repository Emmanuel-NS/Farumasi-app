"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCompactRWF } from "@/lib/utils";
import type { ChartDataPoint } from "@/types";

interface RevenueChartProps { data: ChartDataPoint[]; height?: number }

export function RevenueChart({ data, height = 220 }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => formatCompactRWF(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={70} />
        <Tooltip
          formatter={(value: number, name: string) => [formatCompactRWF(value), name === "value" ? "Revenue" : "Commission"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
        />
        <Area type="monotone" dataKey="secondary" name="commission" stroke="#6366f1" strokeWidth={1.5} fill="url(#commissionGrad)" dot={false} />
        <Area type="monotone" dataKey="value" name="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
