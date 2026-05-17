// ─────────────────────────────────────────────────────────────────────────────
// Rule-based medicine intelligence engine
// NOTE: All recommendations are AI-ASSISTED. Doctor makes final decision.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  Medicine, Patient, MedicineIntelligence, SmartRecommendation,
  PharmacyRecommendation, PrescriptionItem,
} from "@/types";
import { mockPharmacies } from "@/data/mock";

// Score a single medicine for a patient (0-100 per dimension)
export function scoreMedicineForPatient(
  medicine: Medicine,
  patient: Patient
): MedicineIntelligence {
  const warnings: SmartRecommendation[] = [];
  let safetyScore = 100;
  let insuranceScore = 0;
  let availabilityScore = 0;
  let affordabilityScore = 100;

  // ── Safety: allergy check ──────────────────────────────────────────────────
  const allergyMatch = medicine.allergyClass.some((cls) =>
    patient.allergies.map((a) => a.toLowerCase()).includes(cls.toLowerCase())
  );
  if (allergyMatch) {
    safetyScore -= 60;
    warnings.push({
      id: `warn-allergy-${medicine.id}`,
      type: "AllergyAlert",
      severity: "Critical",
      title: "Allergy Alert",
      description: `Patient has documented allergy to ${medicine.allergyClass.join(", ")}. This medicine belongs to that class.`,
      actionLabel: "View Alternatives",
      affectedMedicineIds: [medicine.id],
      isResolved: false,
      resolvedBy: undefined,
      createdAt: new Date().toISOString(),
    });
  }

  // ── Safety: controlled substance ──────────────────────────────────────────
  if (medicine.controlledSubstance) {
    warnings.push({
      id: `warn-controlled-${medicine.id}`,
      type: "DosageCheck",
      severity: "Warning",
      title: "Controlled Substance",
      description: "This is a controlled substance. Verify regulatory requirements and patient risk profile before prescribing.",
      affectedMedicineIds: [medicine.id],
      isResolved: false,
      resolvedBy: undefined,
      createdAt: new Date().toISOString(),
    });
  }

  // ── Insurance ──────────────────────────────────────────────────────────────
  if (patient.insurance === "NONE") {
    insuranceScore = 0;
    warnings.push({
      id: `warn-ins-${medicine.id}`,
      type: "InsuranceOptimization",
      severity: "Info",
      title: "No Insurance Coverage",
      description: "Patient has no insurance. Full out-of-pocket cost applies.",
      affectedMedicineIds: [medicine.id],
      isResolved: false,
      resolvedBy: undefined,
      createdAt: new Date().toISOString(),
    });
  } else if (medicine.insuranceCovered.includes(patient.insurance)) {
    insuranceScore = 100;
  } else {
    insuranceScore = 20;
    warnings.push({
      id: `warn-ins-cov-${medicine.id}`,
      type: "InsuranceOptimization",
      severity: "Warning",
      title: "Not Covered by Insurance",
      description: `${patient.insurance} does not cover this medicine. Patient will pay full cost.`,
      affectedMedicineIds: [medicine.id],
      isResolved: false,
      resolvedBy: undefined,
      createdAt: new Date().toISOString(),
    });
  }

  // ── Availability ───────────────────────────────────────────────────────────
  if (medicine.availability.length === 0) {
    availabilityScore = 0;
  } else {
    const maxStock = Math.max(...medicine.availability.map((a) => a.stockPercent));
    availabilityScore = maxStock;
    if (maxStock < 20) {
      warnings.push({
        id: `warn-stock-${medicine.id}`,
        type: "StockAlert",
        severity: "Warning",
        title: "Very Low Stock",
        description: "Stock levels are critically low across all nearby pharmacies.",
        actionLabel: "View Alternatives",
        affectedMedicineIds: [medicine.id],
        isResolved: false,
        resolvedBy: undefined,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // ── Affordability ──────────────────────────────────────────────────────────
  const avgPrice = (medicine.priceRange.min + medicine.priceRange.max) / 2;
  if (avgPrice > 10000) affordabilityScore = 20;
  else if (avgPrice > 5000) affordabilityScore = 50;
  else if (avgPrice > 2000) affordabilityScore = 70;
  else affordabilityScore = 100;

  const overallScore = Math.round(
    safetyScore * 0.4 +
    insuranceScore * 0.2 +
    availabilityScore * 0.25 +
    affordabilityScore * 0.15
  );

  // ── Pharmacy recommendations ──────────────────────────────────────────────
  const recommendedPharmacies = recommendPharmaciesForItems([{ medicineId: medicine.id } as PrescriptionItem], medicine);

  return {
    medicineId: medicine.id,
    safetyScore: Math.max(0, safetyScore),
    affordabilityScore,
    availabilityScore,
    insuranceScore,
    overallScore: Math.max(0, overallScore),
    warnings,
    recommendedPharmacies,
    alternatives: [],
  };
}

// Score pharmacies for a list of prescription items
export function recommendPharmaciesForItems(
  items: Pick<PrescriptionItem, "medicineId">[],
  medicine: Medicine
): PharmacyRecommendation[] {
  return mockPharmacies
    .map((pharmacy) => {
      const availEntry = medicine.availability.find((a) => a.pharmacyId === pharmacy.id);
      const completenessScore = availEntry?.inStock ? availEntry.stockPercent : 0;
      const distanceScore = Math.max(0, 100 - pharmacy.distanceKm * 5);
      const totalScore = Math.round(
        completenessScore * 0.5 +
        (pharmacy.reliabilityScore) * 0.3 +
        distanceScore * 0.2
      );
      return {
        pharmacy,
        completenessScore,
        totalScore,
        availableItems: availEntry?.inStock ? [medicine.id] : [],
        unavailableItems: !availEntry?.inStock ? [medicine.id] : [],
        estimatedCost: availEntry?.price ?? medicine.priceRange.min,
        insuranceSaving: 0,
        notes: [
          availEntry?.inStock
            ? `In stock at ${availEntry.stockLevel} level`
            : "Out of stock",
          `${pharmacy.distanceKm} km away`,
          `${pharmacy.fulfillmentRate}% fulfillment rate`,
        ],
      } satisfies PharmacyRecommendation;
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 4);
}
