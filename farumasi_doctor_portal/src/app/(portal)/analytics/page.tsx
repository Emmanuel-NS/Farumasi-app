"use client";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, FileText, Users, Package, Activity,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  mockPrescriptionTrend, mockConditionBreakdown, mockFulfillmentByPharmacy,
  mockPrescriptions, mockPatients,
} from "@/data/mock";

const TOP_MEDICINES = [
  { name: "Coartem", count: 38 },
  { name: "Paracetamol", count: 32 },
  { name: "Amoxicillin", count: 27 },
  { name: "Metformin", count: 21 },
  { name: "Amlodipine", count: 16 },
  { name: "Cotrimoxazole", count: 14 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        subtitle="Prescription trends, fulfillment, and clinical patterns"
        icon={<Activity className="w-5 h-5" />}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "This Month", value: mockPrescriptions.length, sub: "prescriptions", icon: FileText, color: "bg-farumasi-50 text-farumasi-700" },
          { label: "Active Patients", value: mockPatients.length, sub: "under care", icon: Users, color: "bg-blue-50 text-blue-700" },
          { label: "Fulfillment Rate", value: "80%", sub: "of prescriptions filled", icon: Package, color: "bg-green-50 text-green-700" },
          { label: "Pending", value: mockPrescriptions.filter(r => r.status === "Pending" || r.status === "Sent").length, sub: "awaiting fulfillment", icon: Activity, color: "bg-amber-50 text-amber-700" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-lg ${k.color} flex items-center justify-center mb-3`}>
              <k.icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{k.value}</p>
            <p className="text-xs text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Prescription trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Prescription Trend (12 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockPrescriptionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPxA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e9e68" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1e9e68" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              <Area type="monotone" dataKey="prescriptions" name="Written" stroke="#1e9e68" strokeWidth={2} fill="url(#gradPxA)" dot={false} />
              <Area type="monotone" dataKey="fulfilled" name="Fulfilled" stroke="#0284c7" strokeWidth={2} fill="none" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conditions pie */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Condition Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={mockConditionBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {mockConditionBreakdown.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {mockConditionBreakdown.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-semibold text-slate-700">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top medicines */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Prescribed Medicines</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={TOP_MEDICINES} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
              <Bar dataKey="count" name="Prescriptions" fill="#1e9e68" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fulfillment by pharmacy */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Fulfillment by Pharmacy</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockFulfillmentByPharmacy} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }} />
              <Bar dataKey="fulfilled" name="Fulfilled" fill="#1e9e68" radius={[3, 3, 0, 0]} />
              <Bar dataKey="partial" name="Partial" fill="#d97706" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Failed" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
