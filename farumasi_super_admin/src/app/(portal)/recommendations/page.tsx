"use client";

import { mockAIInsights, mockDemandForecasts, mockShortageAlerts } from "@/data/mock";
import { Card, CardHeader, CardTitle, CardContent, PageHeader, Badge, StatCard } from "@/components/ui";
import { Lightbulb, Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  const recommendations = [
    ...mockAIInsights.map(i => ({
      id: i.id,
      title: i.title,
      action: i.recommendation,
      category: i.category,
      severity: i.severity,
      type: "Operational",
    })),
    ...mockShortageAlerts.map(a => ({
      id: a.id,
      title: `Resolve ${a.productName} Shortage`,
      action: `${a.affectedPharmacies} pharmacies affected in ${a.affectedDistricts.slice(0, 2).join(", ")}. Restock target: ${a.estimatedRestock}.`,
      category: "Shortage",
      severity: a.severity,
      type: "Supply Chain",
    })),
  ].slice(0, 12);

  return (
    <div className="space-y-5">
      <PageHeader title="Recommendation Intelligence" subtitle="AI-generated action recommendations for platform improvement" breadcrumb="AI & Insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Recommendations" value={recommendations.length} icon={Lightbulb} color="text-farumasi-700" />
        <StatCard label="Critical Actions" value={recommendations.filter(r => r.severity === "Critical").length} icon={Lightbulb} color="text-red-700" />
        <StatCard label="High Priority" value={recommendations.filter(r => r.severity === "High").length} icon={Lightbulb} color="text-amber-700" />
        <StatCard label="Categories" value={new Set(recommendations.map(r => r.type)).size} icon={Sparkles} color="text-blue-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-farumasi-50 flex items-center justify-center shrink-0">
                <Lightbulb className="w-4 h-4 text-farumasi-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-[13px] font-semibold text-slate-900">{rec.title}</p>
                  <div className="flex gap-1 shrink-0">
                    <Badge variant={rec.severity === "Critical" ? "error" : rec.severity === "High" ? "warning" : "info"}>{rec.severity}</Badge>
                    <Badge variant="default">{rec.type}</Badge>
                  </div>
                </div>
                <p className="text-[12px] text-slate-600">{rec.action}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
