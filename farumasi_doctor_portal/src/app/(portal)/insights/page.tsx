"use client";
import {
  TrendingUp, AlertTriangle, Info, ChevronRight,
  ArrowUpRight, ArrowDownRight, Brain,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { mockInsights } from "@/data/mock";
import type { OperationalInsight } from "@/types";

const IMPACT_COLORS: Record<string, string> = {
  High: "bg-red-50 border-red-200 text-red-800",
  Medium: "bg-amber-50 border-amber-200 text-amber-800",
  Low: "bg-blue-50 border-blue-200 text-blue-800",
};

const IMPACT_BADGE: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-blue-100 text-blue-700",
};

const TYPE_COLORS: Record<string, string> = {
  ShortageAlert: "bg-rose-50 text-rose-700",
  AdherenceTrend: "bg-indigo-50 text-indigo-700",
  FulfillmentRate: "bg-teal-50 text-teal-700",
  CostTrend: "bg-purple-50 text-purple-700",
  DiseasePattern: "bg-red-50 text-red-700",
};

export default function InsightsPage() {
  const highImpact = mockInsights.filter((i) => i.impact === "High");
  const mediumImpact = mockInsights.filter((i) => i.impact === "Medium");
  const lowImpact = mockInsights.filter((i) => i.impact === "Low");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Demand & Shortage Insights"
        subtitle="AI-assisted operational intelligence for your prescription patterns"
        icon={<TrendingUp className="w-5 h-5" />}
      />

      {/* AI disclaimer */}
      <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Brain className="w-5 h-5 text-farumasi-400 flex-shrink-0" />
        <p className="text-xs text-slate-300">
          <span className="font-semibold text-white">AI-Assisted Insights</span> — All analysis is rule-based scoring derived from prescription and availability data. Doctor clinical judgment is final.
        </p>
      </div>

      {/* Sections */}
      {highImpact.length > 0 && (
        <InsightSection title="High Priority" insights={highImpact} />
      )}
      {mediumImpact.length > 0 && (
        <InsightSection title="Medium Priority" insights={mediumImpact} />
      )}
      {lowImpact.length > 0 && (
        <InsightSection title="Low Priority" insights={lowImpact} />
      )}
    </div>
  );
}

function InsightSection({ title, insights }: { title: string; insights: OperationalInsight[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-600 mb-3">{title}</h2>
      <div className="space-y-4">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: OperationalInsight }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${IMPACT_BADGE[insight.impact]}`}>
              {insight.impact} Impact
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[insight.category] ?? "bg-slate-100 text-slate-600"}`}>
              {insight.category}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{insight.title}</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{insight.summary}</p>
        </div>
      </div>

      {insight.recommendation && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs font-medium text-farumasi-700 mb-1">Recommended Action</p>
          <p className="text-xs text-slate-600">{insight.recommendation}</p>
        </div>
      )}

      {insight.dataPoints && insight.dataPoints.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.dataPoints.slice(0, 3).map((dp) => (
            <div key={dp.label} className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-[10px] text-slate-400">{dp.label}</p>
              <p className="text-xs font-bold text-slate-800">{dp.value}{dp.unit ? ` ${dp.unit}` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {insight.affectedPharmacies && insight.affectedPharmacies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] text-slate-400">Affected pharmacies:</span>
          {insight.affectedPharmacies.map((p) => (
            <span key={p} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}
