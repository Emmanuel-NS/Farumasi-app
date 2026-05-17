"use client";

import { BarChart2, Download, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { mockKPIs, mockDepartments, mockDoctors, mockAnalytics } from "@/data/mock";
import { formatRWF, formatNumber, formatPercent, getRateColor } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const chartData = mockAnalytics.slice(-10).map((r) => ({
  date: new Date(r.date).toLocaleDateString("en-RW", { month: "short", day: "numeric" }),
  Prescriptions: r.prescriptions,
  Fulfilled: r.fulfillments,
  "Fulfillment %": r.fulfillmentRate,
}));

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Hospital Reports" subtitle="Consolidated operational report — Kigali University Teaching Hospital">
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Printer className="w-4 h-4" />Print</Button>
          <Button size="sm"><Download className="w-4 h-4" />Export</Button>
        </div>
      </PageHeader>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Prescriptions", value: formatNumber(mockKPIs.totalPrescriptionsToday) },
          { label: "Fulfillment Rate", value: formatPercent(mockKPIs.fulfillmentRate) },
          { label: "Active Doctors", value: mockKPIs.activeDoctors },
          { label: "Medicine Shortages", value: mockKPIs.medicineShortages },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* 10-day trend */}
      <Card>
        <CardHeader><CardTitle>10-Day Prescription Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gPrescriptions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFulfilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Prescriptions" stroke="#1e9e68" fill="url(#gPrescriptions)" strokeWidth={2} />
              <Area type="monotone" dataKey="Fulfilled" stroke="#3b82f6" fill="url(#gFulfilled)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department report */}
      <Card>
        <CardHeader><CardTitle>Department Performance Report</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Department", "Head", "Doctors", "Active Rx", "Total Rx", "Fulfillment", "Status"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockDepartments.map((d) => (
                <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">{d.name}</td>
                  <td className="px-5 py-3 text-slate-600 text-sm">{d.headName}</td>
                  <td className="px-5 py-3 text-center font-medium">{d.totalDoctors}</td>
                  <td className="px-5 py-3 text-center font-medium">{d.activePrescriptions}</td>
                  <td className="px-5 py-3 text-center font-medium">{d.totalPrescriptions}</td>
                  <td className="px-5 py-3">
                    <span className={`font-semibold ${getRateColor(d.fulfillmentRate)}`}>{d.fulfillmentRate}%</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={d.status === "Active" ? "success" : "default"}>{d.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top doctors report */}
      <Card>
        <CardHeader><CardTitle>Top 5 Doctors by Prescriptions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...mockDoctors]
            .filter((d) => d.status === "Active")
            .sort((a, b) => b.totalPrescriptions - a.totalPrescriptions)
            .slice(0, 5)
            .map((doc, i) => (
              <div key={doc.id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-farumasi-50 text-farumasi-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">{doc.specialty}</p>
                </div>
                <span className="text-sm font-bold text-slate-900">{doc.totalPrescriptions}</span>
                <span className={`text-sm font-semibold ${getRateColor(doc.fulfillmentRate)}`}>{doc.fulfillmentRate}%</span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
