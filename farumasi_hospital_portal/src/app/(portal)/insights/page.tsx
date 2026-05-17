"use client";

import { useState } from "react";
import { Lightbulb, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, Badge } from "@/components/ui";
import { mockInsights } from "@/data/mock";
import { timeAgo } from "@/lib/utils";
import type { InsightCategory, InsightImpact } from "@/types";

const CATEGORIES: (InsightCategory | "All")[] = ["All", "Shortage", "Fulfillment", "Performance", "Compliance", "Coordination", "Financial"];
const IMPACTS: (InsightImpact | "All")[] = ["All", "High", "Medium", "Low"];

export default function InsightsPage() {
  const [category, setCategory] = useState<InsightCategory | "All">("All");
  const [impact, setImpact] = useState<InsightImpact | "All">("All");

  const filtered = mockInsights.filter((i) => {
    const matchCat = category === "All" || i.category === category;
    const matchImpact = impact === "All" || i.impact === impact;
    return matchCat && matchImpact;
  });

  const impactVariant = (imp: InsightImpact) =>
    imp === "High" ? "warning" : imp === "Medium" ? "info" : "default";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Operational Insights" subtitle="AI-powered analysis of KUTH operational data" />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${category === c ? "bg-farumasi-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {c}
          </button>
        ))}
        <div className="h-auto border-l border-slate-200 mx-1" />
        {IMPACTS.map((imp) => (
          <button
            key={imp}
            onClick={() => setImpact(imp)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${impact === imp ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            {imp}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((insight) => (
          <Card key={insight.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${insight.impact === "High" ? "bg-amber-50" : insight.impact === "Medium" ? "bg-blue-50" : "bg-slate-50"}`}>
                <Lightbulb className={`w-5 h-5 ${insight.impact === "High" ? "text-amber-600" : insight.impact === "Medium" ? "text-blue-600" : "text-slate-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                  <Badge variant={impactVariant(insight.impact)}>{insight.impact}</Badge>
                  <Badge variant="default">{insight.category}</Badge>
                </div>
                <p className="text-sm text-slate-600 mb-2">{insight.summary}</p>
                {insight.suggestedAction && (
                  <div className="p-3 bg-farumasi-50 rounded-lg border border-farumasi-100">
                    <p className="text-xs font-semibold text-farumasi-700 mb-0.5">Recommended Action</p>
                    <p className="text-xs text-farumasi-600">{insight.suggestedAction}</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400 shrink-0">{timeAgo(insight.createdAt)}</span>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No insights match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
