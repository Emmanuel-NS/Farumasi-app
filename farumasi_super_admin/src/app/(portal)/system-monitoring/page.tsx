"use client";

import { mockAnalyticsSeries } from "@/data/mock";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Monitor, Cpu, HardDrive, Activity, Server } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const serverMetrics = [
  { label: "CPU Usage", value: 42, unit: "%", max: 100, color: "bg-blue-500", status: "Normal" },
  { label: "Memory", value: 68, unit: "%", max: 100, color: "bg-emerald-500", status: "Normal" },
  { label: "Disk Usage", value: 55, unit: "%", max: 100, color: "bg-amber-500", status: "Normal" },
  { label: "Network I/O", value: 23, unit: "Mbps", max: 100, color: "bg-purple-500", status: "Low" },
];

const uptimeChartData = mockAnalyticsSeries.map(s => ({
  date: s.date.slice(5),
  cpu: Math.floor(Math.random() * 30 + 30),
  memory: Math.floor(Math.random() * 20 + 60),
  requests: Math.floor(s.orders * 1.5),
}));

export default function SystemMonitoringPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="System Monitoring" subtitle="Server health, performance metrics, and uptime tracking" breadcrumb="System" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Uptime" value="99.98%" icon={Activity} color="text-emerald-700" />
        <StatCard label="Avg Response" value="135ms" icon={Monitor} color="text-blue-700" />
        <StatCard label="Active Servers" value="4 / 4" icon={Server} color="text-farumasi-700" />
        <StatCard label="DB Connections" value="127 / 200" icon={HardDrive} color="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {serverMetrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-semibold text-slate-700">{m.label}</p>
              <Badge variant={m.status === "Normal" ? "success" : m.status === "Low" ? "neutral" : "warning"}>{m.status}</Badge>
            </div>
            <p className="text-[28px] font-bold text-slate-900 leading-none">{m.value}<span className="text-[13px] font-normal text-slate-400 ml-1">{m.unit}</span></p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-farumasi-600" /><CardTitle>System Load (Last 30 Days)</CardTitle></div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={uptimeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#10b981" fill="#d1fae5" strokeWidth={2} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
