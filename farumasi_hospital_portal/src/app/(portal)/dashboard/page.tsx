"use client";

import { useState } from "react";
import {
  UserCheck, ClipboardList, Package, AlertTriangle,
  TrendingUp, Users, GitBranch, ShieldCheck, Activity, CheckCircle2,
  XCircle, Clock, Flame,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import {
  mockKPIs, mockAnalytics, mockDoctors, mockInsights,
  mockShortages, mockAuditLogs, mockDepartments,
} from "@/data/mock";
import { doctorStatusColor, prescriptionStatusColor, timeAgo, formatPercent, getRateColor } from "@/lib/utils";

const CHART_COLORS = ["#1e9e68", "#3cce95", "#d97706", "#ef4444", "#3b82f6"];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"fulfillment" | "prescriptions">("fulfillment");

  const activeDoctors = mockDoctors.filter((d) => d.status === "Active");
  const chartData = mockAnalytics.slice(-14).map((r) => ({
    date: r.date.slice(5),
    prescriptions: r.prescriptions,
    fulfillments: r.fulfillments,
    failures: r.failures,
    rate: r.fulfillmentRate,
  }));

  const deptData = mockDepartments.map((d) => ({
    name: d.code,
    rate: d.fulfillmentRate,
    scripts: d.activePrescriptions,
  }));

  const statusBreakdown = [
    { name: "Active", value: mockKPIs.activeDoctors, color: "#1e9e68" },
    { name: "Pending", value: mockKPIs.pendingDoctors, color: "#d97706" },
    { name: "Restricted", value: mockKPIs.restrictedDoctors, color: "#f97316" },
    { name: "Suspended", value: 1, color: "#ef4444" },
    { name: "Archived", value: 0, color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Kigali University Teaching Hospital — operational command center"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <KpiCard label="Active Doctors" value={mockKPIs.activeDoctors} subtitle={`of ${mockKPIs.totalDoctors} total`} icon={UserCheck} iconColor="text-farumasi-600" accent="bg-farumasi-50" change={0} />
        <KpiCard label="Prescriptions Today" value={mockKPIs.totalPrescriptionsToday} subtitle="24-hour window" icon={ClipboardList} iconColor="text-blue-600" accent="bg-blue-50" change={5} />
        <KpiCard label="Fulfillment Rate" value={formatPercent(mockKPIs.fulfillmentRate)} subtitle="rolling 30-day avg" icon={Package} iconColor="text-emerald-600" accent="bg-emerald-50" change={-2} />
        <KpiCard label="Failed Today" value={mockKPIs.failedToday} subtitle="prescriptions" icon={XCircle} iconColor="text-red-500" accent="bg-red-50" change={-1} />
        <KpiCard label="Medicine Shortages" value={mockKPIs.medicineShortages} subtitle={`${mockKPIs.criticalShortages} critical`} icon={AlertTriangle} iconColor="text-red-500" accent="bg-red-50" />
        <KpiCard label="Active Patients" value={mockKPIs.activePatients} subtitle="currently admitted" icon={Users} iconColor="text-violet-600" accent="bg-violet-50" change={3} />
        <KpiCard label="Pending Referrals" value={mockKPIs.pendingReferrals} subtitle="awaiting response" icon={GitBranch} iconColor="text-amber-600" accent="bg-amber-50" />
        <KpiCard label="Insurance Failures" value={mockKPIs.insuranceFailures} subtitle="this week" icon={Activity} iconColor="text-orange-500" accent="bg-orange-50" change={8} />
        <KpiCard label="Compliance Score" value={`${mockKPIs.complianceScore}%`} subtitle="hospital-wide" icon={ShieldCheck} iconColor="text-farumasi-600" accent="bg-farumasi-50" />
        <KpiCard label="Pending Doctors" value={mockKPIs.pendingDoctors} subtitle="awaiting verification" icon={Clock} iconColor="text-amber-600" accent="bg-amber-50" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fulfillment trend */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>14-Day Operational Trend</CardTitle>
              <div className="flex gap-2">
                {(["fulfillment", "prescriptions"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${activeTab === t ? "bg-farumasi-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {t === "fulfillment" ? "Fulfillment %" : "Volume"}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                {activeTab === "fulfillment" ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis domain={[75, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip formatter={(v) => [`${(v as number).toFixed(1)}%`, "Rate"]} />
                    <Area type="monotone" dataKey="rate" stroke="#1e9e68" strokeWidth={2} fill="url(#rateGrad)" dot={false} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="fulfillments" fill="#1e9e68" radius={[3, 3, 0, 0]} name="Fulfilled" />
                    <Bar dataKey="failures" fill="#ef4444" radius={[3, 3, 0, 0]} name="Failed" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Doctor status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Doctor Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusBreakdown.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-2 mt-2">
              {statusBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-600">{s.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department performance + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department fulfillment */}
        <Card>
          <CardHeader>
            <CardTitle>Department Fulfillment Rates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {[...mockDepartments].sort((a, b) => b.fulfillmentRate - a.fulfillmentRate).map((dept) => (
                <div key={dept.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-10 text-xs font-bold text-farumasi-700 bg-farumasi-50 rounded-md px-1.5 py-1 text-center shrink-0">{dept.code}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{dept.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${dept.fulfillmentRate >= 95 ? "bg-emerald-500" : dept.fulfillmentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${dept.fulfillmentRate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${getRateColor(dept.fulfillmentRate)}`}>
                        {dept.fulfillmentRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{dept.activePrescriptions} active</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Operational Insights</CardTitle>
            <Badge variant="info">{mockInsights.length} total</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {mockInsights.slice(0, 5).map((insight) => (
                <div key={insight.id} className="px-5 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${insight.impact === "High" ? "bg-red-500" : insight.impact === "Medium" ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{insight.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{insight.summary}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={insight.impact === "High" ? "error" : insight.impact === "Medium" ? "warning" : "success"}>{insight.impact}</Badge>
                        <Badge>{insight.category}</Badge>
                        {insight.actionable && <Badge variant="info">Actionable</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Medicine Shortages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {mockAuditLogs.slice(0, 6).map((log) => {
                const isWarning = log.severity === "Warning";
                const isCritical = log.severity === "Critical";
                return (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-farumasi-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500 truncate">{log.actorName} → {log.resourceLabel}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Medicine Shortages */}
        <Card>
          <CardHeader>
            <CardTitle>Medicine Shortages</CardTitle>
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-600">{mockShortages.filter((s) => s.severity === "Critical").length} Critical</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {mockShortages.slice(0, 6).map((shortage) => (
                <div key={shortage.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`shrink-0 w-2 h-2 rounded-full ${shortage.severity === "Critical" ? "bg-red-500" : shortage.severity === "High" ? "bg-orange-500" : shortage.severity === "Medium" ? "bg-amber-500" : "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{shortage.medicineName}</p>
                    <p className="text-xs text-slate-500">{shortage.affectedPharmacies}/{shortage.totalPharmacies} pharmacies · {shortage.impactedPrescriptions} scripts impacted</p>
                  </div>
                  <Badge variant={shortage.severity === "Critical" ? "error" : shortage.severity === "High" ? "warning" : "default"}>
                    {shortage.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
