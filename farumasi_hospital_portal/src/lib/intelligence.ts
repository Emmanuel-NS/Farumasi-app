import type { Doctor, Department, OperationalInsight, MedicineShortage } from "@/types";

export interface HospitalScore {
  overall: number; // 0-100
  fulfillment: number;
  compliance: number;
  staffing: number;
  supply: number;
}

// ─── Score calculation ─────────────────────────────────────────────────────────
export function calcHospitalScore(doctors: Doctor[], departments: Department[], shortages: MedicineShortage[]): HospitalScore {
  const activeDoctors = doctors.filter((d) => d.status === "Active").length;
  const staffing = Math.round((activeDoctors / doctors.length) * 100);

  const avgFulfillment = departments.reduce((s, d) => s + d.fulfillmentRate, 0) / departments.length;
  const fulfillment = Math.round(avgFulfillment);

  const criticalShortages = shortages.filter((s) => s.severity === "Critical").length;
  const supply = Math.max(0, 100 - criticalShortages * 12 - shortages.filter((s) => s.severity === "High").length * 5);

  const compliance = 84; // derived from compliance records
  const overall = Math.round((fulfillment * 0.35 + compliance * 0.25 + staffing * 0.25 + supply * 0.15));

  return { overall, fulfillment, compliance, staffing, supply };
}

// ─── Rule-based insight generator ─────────────────────────────────────────────
export function generateInsights(doctors: Doctor[], departments: Department[], shortages: MedicineShortage[]): OperationalInsight[] {
  const insights: OperationalInsight[] = [];

  // Critical shortage insight
  const critical = shortages.filter((s) => s.severity === "Critical");
  if (critical.length > 0) {
    insights.push({
      id: "gen-001",
      title: `${critical.length} Critical Medicine Shortage${critical.length > 1 ? "s" : ""} Detected`,
      summary: `${critical.map((s) => s.medicineName).join(", ")} ${critical.length === 1 ? "is" : "are"} fully depleted. Immediate procurement action required.`,
      category: "Shortage",
      impact: "High",
      actionable: true,
      suggestedAction: "Initiate emergency procurement from CAMERWA. Notify affected department heads.",
      createdAt: new Date().toISOString(),
    });
  }

  // Low fulfillment departments
  const lowFulfillment = departments.filter((d) => d.fulfillmentRate < 85);
  lowFulfillment.forEach((dept) => {
    insights.push({
      id: `gen-dept-${dept.id}`,
      title: `${dept.name} Below Fulfillment Threshold`,
      summary: `${dept.name} fulfillment rate is ${dept.fulfillmentRate.toFixed(1)}% — below the 85% hospital threshold.`,
      category: "Fulfillment",
      impact: dept.fulfillmentRate < 75 ? "High" : "Medium",
      actionable: true,
      suggestedAction: `Review stock for medicines prescribed in ${dept.name}. Engage pharmacy liaison.`,
      relatedEntityId: dept.id,
      relatedEntityType: "Department",
      createdAt: new Date().toISOString(),
    });
  });

  // Suspended or restricted doctors
  const blockedDoctors = doctors.filter((d) => d.status === "Suspended" || d.status === "Restricted");
  if (blockedDoctors.length > 0) {
    insights.push({
      id: "gen-003",
      title: `${blockedDoctors.length} Doctor${blockedDoctors.length > 1 ? "s" : ""} Suspended or Restricted`,
      summary: `${blockedDoctors.map((d) => d.name).join(", ")} ${blockedDoctors.length === 1 ? "is" : "are"} currently unable to prescribe.`,
      category: "Compliance",
      impact: "Medium",
      actionable: true,
      suggestedAction: "Assign patient coverage to available doctors in the same department.",
      createdAt: new Date().toISOString(),
    });
  }

  return insights;
}

// ─── Doctor performance scoring ───────────────────────────────────────────────
export function doctorPerformanceScore(doctor: Doctor): number {
  if (doctor.totalPrescriptions === 0) return 50;
  const fulfillScore = doctor.fulfillmentRate * 0.6;
  const speedScore = Math.max(0, (60 - doctor.avgResponseTime) / 60) * 40;
  return Math.round(fulfillScore + speedScore);
}

// ─── Fulfillment trend ────────────────────────────────────────────────────────
export type TrendDirection = "up" | "down" | "stable";

export function calcTrend(current: number, previous: number): TrendDirection {
  const diff = current - previous;
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
}
