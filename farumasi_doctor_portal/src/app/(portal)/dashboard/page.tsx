"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  FileText, Users, Package, TrendingUp, AlertTriangle,
  FilePlus, Clock, CheckCircle2, XCircle, ChevronRight,
  Activity, Bell,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/index";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  mockPrescriptions, mockPatients, mockFulfillments,
  mockNotifications, mockInsights, mockPrescriptionTrend,
  mockConditionBreakdown, mockFulfillmentByPharmacy,
} from "@/data/mock";
import {
  getPrescriptionStatusColor, getFulfillmentStatusColor,
  formatDate, timeAgo,
} from "@/lib/utils";

export default function DashboardPage() {
  const [activeRange, setActiveRange] = useState<"week" | "month" | "quarter">("month");

  // KPI data
  const totalPrescriptions = mockPrescriptions.length;
  const fulfilledCount = mockPrescriptions.filter((r) => r.status === "Fulfilled").length;
  const pendingCount = mockPrescriptions.filter((r) => r.status === "Pending" || r.status === "Sent").length;
  const fulfillmentRate = Math.round((fulfilledCount / totalPrescriptions) * 100);
  const criticalNotifs = mockNotifications.filter((n) => n.severity === "Critical" && !n.isRead).length;
  const activePatients = mockPatients.filter((p) => p.status === "Active").length;

  const recentPrescriptions = mockPrescriptions.slice(0, 5);
  const criticalInsights = mockInsights.filter((i) => i.impact === "High");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Clinical Dashboard"
        subtitle={`Good morning, Dr. ${["Jean Pierre Uwimana"].join(" ").split(" ")[0]} — you have ${pendingCount} pending prescription${pendingCount !== 1 ? "s" : ""} today`}
        icon={<Activity className="w-5 h-5" />}
        actions={
          <Link
            href="/prescriptions/new"
            className="inline-flex items-center gap-2 text-sm font-medium bg-farumasi-600 text-white px-4 py-2 rounded-lg hover:bg-farumasi-700 transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            New Prescription
          </Link>
        }
      />

      {/* Critical Alerts Banner */}
      {criticalInsights.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {criticalInsights.length} Active Alert{criticalInsights.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-700 mt-0.5 line-clamp-1">
              {criticalInsights[0].title}
            </p>
          </div>
          <Link
            href="/insights"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
          >
            View all →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Prescriptions"
          value={totalPrescriptions}
          subtitle="This month"
          change={12}
          changeLabel="vs last month"
          icon={<FileText className="w-5 h-5" />}
          color="green"
        />
        <KpiCard
          label="Active Patients"
          value={activePatients}
          subtitle="Under care"
          change={8}
          changeLabel="new this week"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          label="Fulfillment Rate"
          value={`${fulfillmentRate}%`}
          subtitle="Of prescriptions filled"
          change={8}
          changeLabel="vs last month"
          icon={<Package className="w-5 h-5" />}
          color="teal"
        />
        <KpiCard
          label="Pending"
          value={pendingCount}
          subtitle="Awaiting fulfillment"
          change={-3}
          changeLabel="from yesterday"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prescription Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Prescription Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Prescriptions written vs fulfilled</p>
            </div>
            <div className="flex gap-1">
              {(["week", "month", "quarter"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveRange(r)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    activeRange === r
                      ? "bg-farumasi-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockPrescriptionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFul" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
              <Area type="monotone" dataKey="prescriptions" name="Written" stroke="#1e9e68" strokeWidth={2} fill="url(#gradPx)" dot={false} />
              <Area type="monotone" dataKey="fulfilled" name="Fulfilled" stroke="#0284c7" strokeWidth={2} fill="url(#gradFul)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-farumasi-600 rounded" /><span className="text-xs text-slate-500">Prescriptions</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded" /><span className="text-xs text-slate-500">Fulfilled</span></div>
          </div>
        </div>

        {/* Condition Breakdown Pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">By Diagnosis</h3>
          <p className="text-xs text-slate-400 mb-3">Top conditions this month</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={mockConditionBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {mockConditionBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {mockConditionBreakdown.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-700">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fulfillment by pharmacy */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Fulfillment by Pharmacy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Dispensing performance this month</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={mockFulfillmentByPharmacy} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
            <Bar dataKey="fulfilled" name="Fulfilled" fill="#1e9e68" radius={[3, 3, 0, 0]} />
            <Bar dataKey="partial" name="Partial" fill="#d97706" radius={[3, 3, 0, 0]} />
            <Bar dataKey="failed" name="Failed" fill="#dc2626" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-1">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-farumasi-600" /><span className="text-xs text-slate-500">Fulfilled</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /><span className="text-xs text-slate-500">Partial</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /><span className="text-xs text-slate-500">Failed</span></div>
        </div>
      </div>

      {/* Bottom row: Recent Prescriptions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Prescriptions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Prescriptions</h3>
            <Link href="/prescriptions" className="text-xs text-farumasi-600 font-medium hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPrescriptions.map((rx) => (
              <Link
                key={rx.id}
                href={`/prescriptions/${rx.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-farumasi-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-farumasi-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{rx.patientName}</p>
                  <p className="text-xs text-slate-400 truncate">{rx.diagnosis}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPrescriptionStatusColor(rx.status)}`}>
                    {rx.status}
                  </span>
                  <p className="text-[10px] text-slate-400">{timeAgo(rx.createdAt)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions + Alerts */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: FilePlus, label: "Write Prescription", href: "/prescriptions/new", color: "text-farumasi-600" },
                { icon: Users, label: "Find Patient", href: "/patients", color: "text-blue-600" },
                { icon: TrendingUp, label: "View Insights", href: "/insights", color: "text-amber-600" },
                { icon: Bell, label: "Notifications", href: "/notifications", color: "text-purple-600", badge: criticalNotifs },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                  <span className="text-sm text-slate-700 flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="text-xs bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Fulfillment summary */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Fulfillment Summary</h3>
            <div className="space-y-2.5">
              {[
                { label: "Fulfilled", count: mockFulfillments.filter(f => f.status === "Fulfilled").length, icon: CheckCircle2, color: "text-green-600" },
                { label: "Pending", count: mockFulfillments.filter(f => f.status === "Pending").length, icon: Clock, color: "text-amber-600" },
                { label: "Partial", count: mockFulfillments.filter(f => f.status === "PartiallyFulfilled").length, icon: AlertTriangle, color: "text-orange-600" },
                { label: "Failed", count: mockFulfillments.filter(f => f.status === "Failed").length, icon: XCircle, color: "text-red-600" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                    <span className="text-xs text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
