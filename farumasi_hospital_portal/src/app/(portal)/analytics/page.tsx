"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { mockAnalytics } from "@/data/mock";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const TABS = ["Prescriptions", "Fulfillment", "Processing", "Insurance"] as const;
type Tab = typeof TABS[number];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Prescriptions");

  const chartData = mockAnalytics.map((r) => ({
    date: new Date(r.date).toLocaleDateString("en-RW", { month: "short", day: "numeric" }),
    "Prescriptions": r.prescriptions,
    "Fulfilled": r.fulfillments,
    "Failed": r.failures,
    "Fulfillment %": r.fulfillmentRate,
    "Avg Processing (min)": r.avgProcessingTime,
    "Insurance Claims": r.insuranceClaims,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Hospital Analytics" subtitle="16-day historical performance — KUTH operational intelligence" />

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Daily Rx", value: Math.round(mockAnalytics.reduce((s, r) => s + r.prescriptions, 0) / mockAnalytics.length) },
          { label: "Avg Fulfillment", value: `${Math.round(mockAnalytics.reduce((s, r) => s + r.fulfillmentRate, 0) / mockAnalytics.length)}%` },
          { label: "Total Failures", value: mockAnalytics.reduce((s, r) => s + r.failures, 0) },
          { label: "Total Insurance Claims", value: mockAnalytics.reduce((s, r) => s + r.insuranceClaims, 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${activeTab === tab ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Charts */}
      {activeTab === "Prescriptions" && (
        <Card>
          <CardHeader><CardTitle>Prescription Volume — Total vs Fulfilled vs Failed</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Prescriptions" stroke="#1e9e68" fill="url(#gP)" strokeWidth={2} />
                <Area type="monotone" dataKey="Fulfilled" stroke="#3b82f6" fill="url(#gF)" strokeWidth={2} />
                <Area type="monotone" dataKey="Failed" stroke="#ef4444" fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === "Fulfillment" && (
        <Card>
          <CardHeader><CardTitle>Daily Fulfillment Rate (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="Fulfillment %" stroke="#1e9e68" strokeWidth={2.5} dot={{ fill: "#1e9e68", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === "Processing" && (
        <Card>
          <CardHeader><CardTitle>Average Processing Time per Day (minutes)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="Avg Processing (min)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === "Insurance" && (
        <Card>
          <CardHeader><CardTitle>Daily Insurance Claims Submitted</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="Insurance Claims" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


