"use client";

import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Zap, TrendingUp, Brain } from "lucide-react";

const predictions = [
  { id: "1", title: "Malaria Season Surge", description: "High probability of 40-60% increase in antimalarial demand in Q1 2025 across Eastern Province.", confidence: 87, timeframe: "Q1 2025", impact: "High", category: "Demand" },
  { id: "2", title: "Pharmacy Network Expansion", description: "Model predicts 15-20 new pharmacy registrations in Kigali over next 60 days based on growth patterns.", confidence: 72, timeframe: "60 days", impact: "Medium", category: "Growth" },
  { id: "3", title: "Insulin Supply Risk", description: "Predicted shortage of long-acting insulin across private pharmacies by end of March if procurement is not accelerated.", confidence: 91, timeframe: "March 2025", impact: "Critical", category: "Shortage" },
  { id: "4", title: "Doctor Adoption Wave", description: "45-55 new doctor onboardings expected next month from CHUK and KFH based on institutional push patterns.", confidence: 68, timeframe: "Next month", impact: "Medium", category: "Growth" },
  { id: "5", title: "Fulfillment Optimization Window", description: "Algorithm detects an 8-day window in February where fulfillment rates can be improved by 12% through pre-positioning.", confidence: 79, timeframe: "Feb 2025", impact: "High", category: "Operational" },
  { id: "6", title: "Revenue Milestone Trajectory", description: "Platform on track to exceed RWF 300M total revenue milestone by April 2025.", confidence: 83, timeframe: "April 2025", impact: "Positive", category: "Finance" },
];

export default function PredictionsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="Ecosystem Predictions" subtitle="AI model predictions for platform trajectories and ecosystem risks" breadcrumb="AI & Insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Predictions" value={predictions.length} icon={Zap} color="text-farumasi-700" />
        <StatCard label="High Confidence (>80%)" value={predictions.filter(p => p.confidence >= 80).length} icon={Brain} color="text-emerald-700" />
        <StatCard label="Critical Impact" value={predictions.filter(p => p.impact === "Critical").length} icon={TrendingUp} color="text-red-700" />
        <StatCard label="Avg. Confidence" value={`${Math.round(predictions.reduce((a, p) => a + p.confidence, 0) / predictions.length)}%`} icon={Zap} color="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {predictions.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[13px] font-semibold text-slate-900">{p.title}</p>
              <div className="flex gap-1 shrink-0">
                <Badge variant={p.impact === "Critical" ? "error" : p.impact === "High" ? "warning" : p.impact === "Positive" ? "success" : "info"}>{p.impact}</Badge>
                <Badge variant="default">{p.category}</Badge>
              </div>
            </div>
            <p className="text-[12px] text-slate-600 mb-3">{p.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400">Timeframe</p>
                <p className="text-[12px] font-semibold text-slate-700">{p.timeframe}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">Confidence</p>
                <p className={`text-[16px] font-bold ${p.confidence >= 80 ? "text-emerald-600" : p.confidence >= 65 ? "text-amber-600" : "text-slate-600"}`}>{p.confidence}%</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
