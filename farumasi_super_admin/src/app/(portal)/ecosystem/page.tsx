"use client";

import { mockKPIs, mockEcosystemMetrics, mockHospitals, mockPharmacies, mockDoctors, mockRiders } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar, StatCard } from "@/components/ui";
import { Building2, ShoppingBag, Stethoscope, Navigation, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const radarData = [
  { subject: "Fulfillment", A: mockKPIs.fulfillmentRate },
  { subject: "Health", A: mockKPIs.platformHealthScore },
  { subject: "Growth", A: Math.min(100, mockKPIs.monthlyGrowth * 10) },
  { subject: "Coverage", A: 72 },
  { subject: "Compliance", A: 88 },
  { subject: "AI Safety", A: 100 - mockKPIs.aiRiskScore },
];

const entityBar = [
  { name: "Hospitals", count: mockKPIs.activeHospitals, color: "#3b82f6" },
  { name: "Pharmacies", count: mockKPIs.activePharmacies, color: "#8b5cf6" },
  { name: "Doctors", count: mockKPIs.activeDoctors, color: "#06b6d4" },
  { name: "Riders", count: mockKPIs.activeRiders, color: "#f59e0b" },
  { name: "Suppliers", count: mockKPIs.activeSuppliers, color: "#10b981" },
];

export default function EcosystemPage() {
  const hospitalHealthAvg = Math.round(mockHospitals.reduce((a, h) => a + h.fulfillmentRate, 0) / mockHospitals.length);
  const pharmacyCritical = mockPharmacies.filter(p => p.stockLevel === "Critical").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">Executive</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Ecosystem Health</h1>
        <p className="text-sm text-slate-500 mt-1">Entity-level health scores and growth metrics across the FARUMASI ecosystem.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Platform Health" value={`${mockKPIs.platformHealthScore}/100`} icon={Activity} change={2.1} color="text-emerald-700" />
        <StatCard label="AI Risk Score" value={mockKPIs.aiRiskScore} icon={AlertTriangle} color={mockKPIs.aiRiskScore >= 40 ? "text-amber-700" : "text-emerald-700"} />
        <StatCard label="Monthly Growth" value={`${mockKPIs.monthlyGrowth}%`} icon={TrendingUp} color="text-farumasi-700" />
        <StatCard label="Total Users" value={mockKPIs.totalUsers.toLocaleString()} icon={Navigation} color="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Ecosystem Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Radar name="Score" dataKey="A" stroke="#1e9e68" fill="#1e9e68" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active Entity Counts</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={entityBar} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#1e9e68" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Hospital Performance</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {mockHospitals.slice(0, 6).map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{h.name}</p>
                    <p className="text-[10px] text-slate-400">{h.district} · {h.totalDoctors} doctors · {h.totalBeds} beds</p>
                  </div>
                  <div className="text-right shrink-0 w-16">
                    <p className={cn("text-sm font-bold", h.fulfillmentRate >= 80 ? "text-emerald-600" : h.fulfillmentRate >= 60 ? "text-amber-600" : "text-red-600")}>{h.fulfillmentRate}%</p>
                    <ProgressBar value={h.fulfillmentRate} className="mt-1" color={h.fulfillmentRate >= 80 ? "bg-emerald-500" : "bg-amber-500"} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Real-Time Metrics</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockEcosystemMetrics.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-slate-700">{m.metric}</p>
                    <p className={cn("text-[10px] font-medium", m.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.change >= 0 ? "↑" : "↓"} {Math.abs(m.change)}%
                    </p>
                  </div>
                  <p className="text-base font-bold text-slate-900">{m.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
