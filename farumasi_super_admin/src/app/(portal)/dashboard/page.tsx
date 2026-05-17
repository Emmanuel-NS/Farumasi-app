"use client";

import { mockKPIs, mockAIInsights, mockAnalyticsSeries, mockShortageAlerts, mockVerifications, mockEcosystemMetrics } from "@/data/mock";
import { formatRWF, formatDate, cn } from "@/lib/utils";
import { StatCard, Card, CardHeader, CardTitle, CardContent, Badge, Button, ProgressBar } from "@/components/ui";
import {
  Users, Building2, ShoppingBag, Truck, Stethoscope, FileText,
  CheckCircle2, AlertTriangle, TrendingUp, Activity,
  Navigation, BadgeCheck, ChevronRight, Sparkles, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

const severityVariant = (s: string) => {
  if (s === "Critical") return "error";
  if (s === "High") return "warning";
  if (s === "Medium") return "info";
  return "neutral";
};

export default function DashboardPage() {
  const chartData = mockAnalyticsSeries.slice(0, 30).map((d) => ({
    date: d.date.slice(5),
    prescriptions: d.prescriptions,
    fulfilled: d.fulfillments,
    orders: d.orders,
    revenue: Math.round(d.revenue / 1000000),
  }));

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">FARUMASI Ecosystem</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Command Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time overview of the FARUMASI healthcare ecosystem.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={mockKPIs.totalUsers.toLocaleString()} icon={Users} change={mockKPIs.monthlyGrowth} color="text-farumasi-700" />
        <StatCard label="Active Hospitals" value={mockKPIs.activeHospitals} icon={Building2} color="text-blue-700" />
        <StatCard label="Active Pharmacies" value={mockKPIs.activePharmacies} icon={ShoppingBag} color="text-purple-700" />
        <StatCard label="Active Suppliers" value={mockKPIs.activeSuppliers} icon={Truck} color="text-orange-700" />
        <StatCard label="Active Doctors" value={mockKPIs.activeDoctors.toLocaleString()} icon={Stethoscope} color="text-sky-700" />
        <StatCard label="Total Prescriptions" value={mockKPIs.totalPrescriptions.toLocaleString()} icon={FileText} color="text-indigo-700" />
        <StatCard label="Active Riders" value={mockKPIs.activeRiders} icon={Navigation} color="text-teal-700" />
        <StatCard label="Pending Verifications" value={mockKPIs.pendingVerifications} icon={BadgeCheck} color="text-amber-700" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Fulfillment Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{mockKPIs.fulfillmentRate}%</p>
          <ProgressBar value={mockKPIs.fulfillmentRate} className="mt-2" color="bg-emerald-500" />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Total Revenue (RWF)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatRWF(mockKPIs.totalRevenue)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Pending commissions: {formatRWF(mockKPIs.pendingCommissions)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">Platform Health Score</p>
          <p className={cn("text-2xl font-bold mt-1", mockKPIs.platformHealthScore >= 80 ? "text-emerald-600" : mockKPIs.platformHealthScore >= 60 ? "text-amber-600" : "text-red-600")}>
            {mockKPIs.platformHealthScore}
          </p>
          <ProgressBar value={mockKPIs.platformHealthScore} className="mt-2" color={mockKPIs.platformHealthScore >= 80 ? "bg-emerald-500" : "bg-amber-500"} />
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 font-medium">AI Risk Score</p>
          <p className={cn("text-2xl font-bold mt-1", mockKPIs.aiRiskScore >= 70 ? "text-red-600" : mockKPIs.aiRiskScore >= 40 ? "text-amber-600" : "text-emerald-600")}>
            {mockKPIs.aiRiskScore}
          </p>
          <ProgressBar value={mockKPIs.aiRiskScore} className="mt-2" color={mockKPIs.aiRiskScore >= 70 ? "bg-red-500" : "bg-amber-500"} />
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Fulfillment Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Fulfillment & Order Trends</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">30-day prescriptions vs fulfilled orders</p>
            </div>
            <Badge variant="success">Live</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradFulfilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPrescriptions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="fulfilled" stroke="#1e9e68" strokeWidth={2} fill="url(#gradFulfilled)" name="Fulfilled" />
                <Area type="monotone" dataKey="prescriptions" stroke="#6366f1" strokeWidth={2} fill="url(#gradPrescriptions)" name="Prescriptions" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue (M RWF)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData.slice(-14)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="revenue" fill="#1e9e68" radius={[4, 4, 0, 0]} name="Revenue (M)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights + Shortage + Verifications */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* AI Insights Feed */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-farumasi-600" />
              <CardTitle>AI Operational Insights</CardTitle>
            </div>
            <Button variant="ghost" size="xs" className="text-farumasi-600 hover:text-farumasi-700">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {mockAIInsights.slice(0, 5).map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                    insight.severity === "Critical" ? "bg-red-500" :
                    insight.severity === "High" ? "bg-amber-500" :
                    insight.severity === "Medium" ? "bg-blue-500" : "bg-slate-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-slate-900 leading-snug">{insight.title}</p>
                      <Badge variant={severityVariant(insight.severity)} className="shrink-0">{insight.severity}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{insight.summary}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="default">{insight.category}</Badge>
                      <span className="text-[10px] text-slate-400">Confidence: {insight.confidence}%</span>
                      <span className="text-[10px] text-slate-400">{insight.affectedEntities.length} affected</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shortage + Pending Verifications */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <CardTitle>Active Shortages</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {mockShortageAlerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                      alert.riskScore >= 80 ? "bg-red-500" : alert.riskScore >= 60 ? "bg-amber-500" : "bg-yellow-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{alert.productName}</p>
                      <p className="text-[10px] text-slate-400">{alert.affectedPharmacies} pharmacies · Risk {alert.riskScore}</p>
                    </div>
                    <Badge variant={alert.severity === "Critical" ? "error" : "warning"} className="shrink-0">{alert.severity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-sky-600" />
                <CardTitle>Pending Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {mockVerifications.filter(v => v.status === "Pending").slice(0, 4).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-slate-500">{v.entityName.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{v.entityName}</p>
                      <p className="text-[10px] text-slate-400">{v.entityType} · {formatDate(v.submittedAt)}</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ecosystem Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-farumasi-600" />
            <CardTitle>Ecosystem Real-Time Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mockEcosystemMetrics.map((m) => (
              <div key={m.id} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide truncate">{m.metric}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {m.value.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-1">{m.period}</span>
                </p>
                <p className={cn("text-[11px] font-semibold mt-1", m.change >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {m.change >= 0 ? "↑" : "↓"} {Math.abs(m.change)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
