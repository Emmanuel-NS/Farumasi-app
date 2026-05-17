"use client";

import { Activity, ClipboardList, Users, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { mockDepartments, mockKPIs, mockInsights, mockPrescriptions } from "@/data/mock";
import { getRateColor, timeAgo } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function OperationsPage() {
  const urgentPending = mockPrescriptions.filter((rx) => rx.status === "Pending" && rx.priority === "Urgent").length;
  const sentActive = mockPrescriptions.filter((rx) => rx.status === "Sent").length;
  const criticalInsights = mockInsights.filter((i) => i.impact === "High");

  const deptData = mockDepartments.map((d) => ({
    name: d.code,
    "Active Rx": d.activePrescriptions,
    "Fulfillment %": d.fulfillmentRate,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Clinical Operations" subtitle="Operational pulse — prescriptions, department throughput, and active alerts" />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Urgent Pending Rx", value: urgentPending, color: "text-red-600", bg: "bg-red-50" },
          { label: "Sent to Pharmacy", value: sentActive, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Fulfillment Rate", value: `${mockKPIs.fulfillmentRate}%`, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Critical Shortages", value: mockKPIs.criticalShortages, color: "text-farumasi-600", bg: "bg-farumasi-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-slate-100 p-4`}>
            <p className="text-xs text-slate-600 font-medium">{label}</p>
            <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
          </div>
        ))}
      </div>

      {urgentPending > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-800">{urgentPending} urgent prescription{urgentPending !== 1 ? "s" : ""} awaiting dispensing — immediate pharmacist action required</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dept throughput chart */}
        <Card>
          <CardHeader><CardTitle>Department Active Load</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} margin={{ top: 4, right: 12, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="Active Rx" fill="#1e9e68" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dept fulfillment */}
        <Card>
          <CardHeader><CardTitle>Fulfillment Rates by Dept</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mockDepartments.map((d) => (
              <div key={d.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{d.name}</span>
                  <span className={`font-semibold ${getRateColor(d.fulfillmentRate)}`}>{d.fulfillmentRate}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.fulfillmentRate >= 95 ? "bg-emerald-500" : d.fulfillmentRate >= 85 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${d.fulfillmentRate}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Critical Insights */}
      <Card>
        <CardHeader><CardTitle>Critical Operational Insights</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {criticalInsights.map((insight) => (
            <div key={insight.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${insight.impact === "High" ? "bg-red-500" : "bg-amber-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                  <Badge variant={insight.impact === "High" ? "error" : "warning"}>{insight.impact}</Badge>
                </div>
                <p className="text-xs text-slate-500">{insight.summary}</p>
                <p className="text-xs text-slate-400 mt-1">{insight.suggestedAction}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{timeAgo(insight.createdAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
