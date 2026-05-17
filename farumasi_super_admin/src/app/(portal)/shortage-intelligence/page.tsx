"use client";

import { mockShortageAlerts } from "@/data/mock";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard, ProgressBar } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

export default function ShortageIntelligencePage() {
  const critical = mockShortageAlerts.filter(a => a.severity === "Critical").length;
  const avgRisk = Math.round(mockShortageAlerts.reduce((a, s) => a + s.riskScore, 0) / mockShortageAlerts.length);

  return (
    <div className="space-y-5">
      <PageHeader title="Shortage Intelligence" subtitle="AI-detected medicine shortage alerts and risk scoring" breadcrumb="AI & Insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Alerts" value={mockShortageAlerts.length} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Critical" value={critical} icon={AlertTriangle} color="text-red-700" />
        <StatCard label="Avg Risk Score" value={avgRisk} icon={AlertTriangle} color="text-amber-700" />
        <StatCard label="Total Pharmacies Affected" value={mockShortageAlerts.reduce((a, s) => a + s.affectedPharmacies, 0)} icon={AlertTriangle} color="text-orange-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockShortageAlerts.map((alert) => (
          <Card key={alert.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[14px] font-bold text-slate-900">{alert.productName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{alert.category}</p>
              </div>
              <Badge variant={alert.severity === "Critical" ? "error" : alert.severity === "High" ? "warning" : "info"}>{alert.severity}</Badge>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Risk Score</p>
                <p className={cn("text-xs font-bold", alert.riskScore >= 80 ? "text-red-600" : alert.riskScore >= 60 ? "text-amber-600" : "text-yellow-600")}>{alert.riskScore}/100</p>
              </div>
              <ProgressBar value={alert.riskScore} color={alert.riskScore >= 80 ? "bg-red-500" : alert.riskScore >= 60 ? "bg-amber-500" : "bg-yellow-400"} />
            </div>

            <p className="text-[12px] text-slate-600 mb-3">Districts: {alert.affectedDistricts.join(", ")}</p>

            <div className="bg-farumasi-50 border border-farumasi-100 rounded-lg p-2.5 mb-3">
              <p className="text-[10px] font-semibold text-farumasi-700 mb-0.5">Estimated Restock</p>
              <p className="text-[11px] text-farumasi-600">{formatDate(alert.estimatedRestock)}</p>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span>{alert.affectedPharmacies} pharmacies</span>
              <span>Current stock: {alert.currentStock.toLocaleString()}</span>
              <span>Detected: {formatDate(alert.createdAt)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
