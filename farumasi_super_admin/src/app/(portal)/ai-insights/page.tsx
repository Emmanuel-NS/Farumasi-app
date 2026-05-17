"use client";

import { useState } from "react";
import { mockAIInsights } from "@/data/mock";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, FilterTabs, StatCard } from "@/components/ui";
import { Sparkles, AlertCircle, Brain } from "lucide-react";
import { InsightSeverity, InsightCategory } from "@/types";

const SEV_FILTERS: (InsightSeverity | "All")[] = ["All", "Critical", "High", "Medium", "Low"];
const CAT_FILTERS: (InsightCategory | "All")[] = ["All", "Shortage", "Fulfillment", "Demand", "Compliance", "Security", "Financial", "Accessibility", "Performance"];

export default function AIInsightsPage() {
  const [sev, setSev] = useState<InsightSeverity | "All">("All");
  const [cat, setCat] = useState<InsightCategory | "All">("All");

  const filtered = mockAIInsights.filter(i => {
    return (sev === "All" || i.severity === sev) && (cat === "All" || i.category === cat);
  });

  const critical = mockAIInsights.filter(i => i.severity === "Critical").length;
  const high = mockAIInsights.filter(i => i.severity === "High").length;

  return (
    <div className="space-y-5">
      <PageHeader title="AI Operational Insights" subtitle="AI-generated operational intelligence for the FARUMASI ecosystem" breadcrumb="AI & Insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Insights" value={mockAIInsights.length} icon={Sparkles} color="text-farumasi-700" />
        <StatCard label="Critical" value={critical} icon={AlertCircle} color="text-red-700" />
        <StatCard label="High Priority" value={high} icon={AlertCircle} color="text-amber-700" />
        <StatCard label="AI Risk Score" value={32} icon={Brain} color="text-orange-700" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-farumasi-600" /><CardTitle>Insights Feed</CardTitle></div>
          <div className="flex flex-col gap-2 items-end">
            <FilterTabs options={SEV_FILTERS} value={sev} onChange={setSev} />
            <FilterTabs options={CAT_FILTERS} value={cat} onChange={setCat} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {filtered.map((insight) => (
              <div key={insight.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className={cn("w-2.5 h-2.5 rounded-full mt-1.5 shrink-0",
                    insight.severity === "Critical" ? "bg-red-500" :
                    insight.severity === "High" ? "bg-amber-500" :
                    insight.severity === "Medium" ? "bg-blue-500" : "bg-slate-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-[13px] font-semibold text-slate-900">{insight.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={insight.severity === "Critical" ? "error" : insight.severity === "High" ? "warning" : insight.severity === "Medium" ? "info" : "neutral"}>{insight.severity}</Badge>
                        <Badge variant="default">{insight.category}</Badge>
                      </div>
                    </div>
                    <p className="text-[12px] text-slate-600 mb-2">{insight.summary}</p>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                      <p className="text-[11px] font-semibold text-amber-700 mb-0.5">Recommendation</p>
                      <p className="text-[11px] text-amber-600">{insight.recommendation}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400">
                      <span>Confidence: <strong className="text-slate-600">{insight.confidence}%</strong></span>
                      <span>Affected: <strong className="text-slate-600">{insight.affectedEntities.length} entities</strong></span>
                      <span>Detected: <strong className="text-slate-600">{formatDate(insight.createdAt)}</strong></span>
                      <span>Status: <strong className="text-slate-600">{insight.status}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">No insights match the current filters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
