// ═══════════════════════════════════════════════════════════════════════════════
// FARUMASI AI PHARMACY RECOMMENDATION ENGINE
//
// Implements weighted scoring logic to recommend the top 3 pharmacies for a
// given prescription. This is NOT machine learning — it is a transparent,
// explainable rule-based scoring engine. Replace with real AI/ML when backend
// is integrated.
//
// SAFETY NOTE: This engine only recommends fulfillment options.
// It does NOT prescribe, diagnose, or override doctor decisions.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  PharmacyRecommendation,
  PharmacyRecommendationReason,
  PharmacyRecommendationWarning,
  Pharmacy,
  ProductListing,
  CatalogueProduct,
  InsuranceProvider,
} from "../types";

// ── Score Weights ─────────────────────────────────────────────────────────────
// Adjust these weights to change recommendation priorities
const WEIGHTS = {
  availability: 0.35,     // Can the pharmacy fulfill the full prescription?
  insurance: 0.25,        // Does it accept the patient's insurance?
  price: 0.15,            // Is the total cost affordable?
  location: 0.12,         // How close is it to the patient?
  delivery: 0.07,         // Does it offer delivery if patient wants it?
  reliability: 0.04,      // Historical fulfillment track record
  expirySafety: 0.02,     // Are the medicines safely within expiry?
} as const;

// ── Expiry Safety Threshold ───────────────────────────────────────────────────
const MIN_EXPIRY_DAYS = 30;        // medicines expiring within 30 days → warning
const UNSAFE_EXPIRY_DAYS = 0;      // already expired → never recommend

// ── Price Score Bands (RWF totals) ────────────────────────────────────────────
const PRICE_BAND_VERY_LOW = 5_000;
const PRICE_BAND_LOW = 15_000;
const PRICE_BAND_MID = 40_000;
const PRICE_BAND_HIGH = 100_000;

// ── Distance Score Bands (km) ─────────────────────────────────────────────────
const DISTANCE_VERY_NEAR = 1;
const DISTANCE_NEAR = 3;
const DISTANCE_MID = 7;
const DISTANCE_FAR = 15;

// ── Input Types ───────────────────────────────────────────────────────────────

export interface RecommendationInput {
  /** IDs of catalogue products in the prescription */
  prescriptionItemIds: string[];                // cat-xxx IDs
  /** Quantities needed per product */
  quantities: Record<string, number>;           // { "cat-003": 60 }
  /** Patient's insurance provider (or "NONE") */
  patientInsurance: InsuranceProvider;
  /** Patient location coordinates */
  patientLat: number;
  patientLng: number;
  /** Whether the patient wants delivery */
  preferDelivery: boolean;
  /** Available pharmacies to score */
  pharmacies: Pharmacy[];
  /** All product listings on the platform */
  productListings: ProductListing[];
  /** Catalogue products (for expiry awareness) */
  catalogueProducts: CatalogueProduct[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function estimateDeliveryMinutes(distanceKm: number): number {
  // ~3km/min on Kigali roads including traffic factor
  return Math.round(distanceKm * 3 + 10);
}

// ── Score Calculators ─────────────────────────────────────────────────────────

function calcAvailabilityScore(
  pharmacyId: string,
  prescriptionItemIds: string[],
  quantities: Record<string, number>,
  productListings: ProductListing[]
): { score: number; availableCount: number; unavailableIds: string[]; expirySoon: string[] } {
  const unavailableIds: string[] = [];
  const expirySoon: string[] = [];
  let totalWeight = 0;
  let filledWeight = 0;

  for (const productId of prescriptionItemIds) {
    const qty = quantities[productId] ?? 1;
    const listing = productListings.find(
      (l) => l.catalogueProductId === productId && l.pharmacyId === pharmacyId
    );

    if (!listing || !listing.isAvailable || listing.stockQty < 1) {
      unavailableIds.push(productId);
      totalWeight += qty;
      continue;
    }

    // Check expiry safety
    if (listing.daysUntilExpiry !== undefined) {
      if (listing.daysUntilExpiry <= UNSAFE_EXPIRY_DAYS) {
        unavailableIds.push(productId); // treat expired as unavailable
        totalWeight += qty;
        continue;
      }
      if (listing.daysUntilExpiry <= MIN_EXPIRY_DAYS) {
        expirySoon.push(productId);
      }
    }

    // Partial stock check
    const canFulfill = listing.stockQty >= qty ? 1 : listing.stockQty / qty;
    filledWeight += qty * canFulfill;
    totalWeight += qty;
  }

  const availableCount = prescriptionItemIds.length - unavailableIds.length;
  const score = totalWeight > 0 ? clamp((filledWeight / totalWeight) * 100) : 0;
  return { score, availableCount, unavailableIds, expirySoon };
}

function calcInsuranceScore(
  pharmacy: Pharmacy,
  patientInsurance: InsuranceProvider,
  prescriptionItemIds: string[],
  productListings: ProductListing[]
): { score: number; saving: number; estimatedTotal: number } {
  if (patientInsurance === "NONE") return { score: 50, saving: 0, estimatedTotal: 0 };

  // Check if pharmacy accepts the insurance
  const pharmacyAccepts = pharmacy.acceptedInsurance.includes(patientInsurance);
  if (!pharmacyAccepts) return { score: 0, saving: 0, estimatedTotal: 0 };

  // Estimate how many covered items get discounted
  const TYPICAL_COVERAGE = 0.80; // 80% typical RSSB/MMI coverage
  let estimatedTotal = 0;
  let coveredTotal = 0;

  for (const productId of prescriptionItemIds) {
    const listing = productListings.find(
      (l) => l.catalogueProductId === productId && l.pharmacyId === pharmacy.id
    );
    if (!listing) continue;

    const listingAccepts = listing.acceptedInsurance.includes(patientInsurance);
    const itemCost = listing.price;
    estimatedTotal += itemCost;
    if (listingAccepts) {
      coveredTotal += itemCost * TYPICAL_COVERAGE;
    }
  }

  const saving = coveredTotal;
  // Score based on how much of the prescription is covered
  const coverageRatio = estimatedTotal > 0 ? saving / (estimatedTotal * TYPICAL_COVERAGE) : 0;
  const score = clamp(coverageRatio * 100);

  return { score, saving: Math.round(saving), estimatedTotal };
}

function calcPriceScore(
  pharmacyId: string,
  prescriptionItemIds: string[],
  quantities: Record<string, number>,
  productListings: ProductListing[],
  insuranceSaving: number
): { score: number; estimatedTotal: number } {
  let total = 0;
  for (const productId of prescriptionItemIds) {
    const qty = quantities[productId] ?? 1;
    const listing = productListings.find(
      (l) => l.catalogueProductId === productId && l.pharmacyId === pharmacyId
    );
    if (listing) {
      total += listing.price * qty;
    }
  }

  const netTotal = Math.max(0, total - insuranceSaving);

  let score: number;
  if (netTotal <= PRICE_BAND_VERY_LOW) score = 100;
  else if (netTotal <= PRICE_BAND_LOW) score = 80;
  else if (netTotal <= PRICE_BAND_MID) score = 60;
  else if (netTotal <= PRICE_BAND_HIGH) score = 40;
  else score = 20;

  return { score, estimatedTotal: Math.round(netTotal) };
}

function calcLocationScore(distanceKm: number): number {
  if (distanceKm <= DISTANCE_VERY_NEAR) return 100;
  if (distanceKm <= DISTANCE_NEAR) return 80;
  if (distanceKm <= DISTANCE_MID) return 60;
  if (distanceKm <= DISTANCE_FAR) return 35;
  return 15;
}

function calcDeliveryScore(
  pharmacy: Pharmacy,
  pharmacyId: string,
  preferDelivery: boolean,
  prescriptionItemIds: string[],
  productListings: ProductListing[]
): number {
  if (!preferDelivery) return 70; // neutral if patient doesn't need delivery

  // Check if at least one relevant listing offers delivery
  const hasDelivery = prescriptionItemIds.some((productId) =>
    productListings.some(
      (l) =>
        l.catalogueProductId === productId &&
        l.pharmacyId === pharmacyId &&
        l.deliveryAvailable
    )
  );
  return hasDelivery ? 100 : 0;
}

function calcExpirySafetyScore(expirySoonIds: string[], totalItems: number): number {
  if (totalItems === 0) return 100;
  const ratio = expirySoonIds.length / totalItems;
  return clamp((1 - ratio) * 100);
}

// ── Main Recommendation Engine ────────────────────────────────────────────────

export function recommendPharmacies(input: RecommendationInput): PharmacyRecommendation[] {
  const {
    prescriptionItemIds,
    quantities,
    patientInsurance,
    patientLat,
    patientLng,
    preferDelivery,
    pharmacies,
    productListings,
  } = input;

  if (prescriptionItemIds.length === 0 || pharmacies.length === 0) return [];

  const scored: (PharmacyRecommendation & { _rawTotal: number })[] = [];

  for (const pharmacy of pharmacies) {
    if (pharmacy.status !== "active") continue;

    // 1. Availability
    const avail = calcAvailabilityScore(
      pharmacy.id,
      prescriptionItemIds,
      quantities,
      productListings
    );

    // Skip pharmacies that can't fill any item at all
    if (avail.availableCount === 0) continue;

    // 2. Insurance
    const ins = calcInsuranceScore(
      pharmacy,
      patientInsurance,
      prescriptionItemIds,
      productListings
    );

    // 3. Price
    const priceResult = calcPriceScore(
      pharmacy.id,
      prescriptionItemIds,
      quantities,
      productListings,
      ins.saving
    );

    // 4. Location
    const distanceKm = haversineKm(patientLat, patientLng, pharmacy.lat, pharmacy.lng);
    const locationScore = calcLocationScore(distanceKm);

    // 5. Delivery
    const deliveryScore = calcDeliveryScore(
      pharmacy,
      pharmacy.id,
      preferDelivery,
      prescriptionItemIds,
      productListings
    );

    // 6. Reliability (from historical data)
    const reliabilityScore = clamp(pharmacy.reliabilityScore);

    // 7. Expiry Safety
    const expirySafetyScore = calcExpirySafetyScore(
      avail.expirySoon,
      prescriptionItemIds.length
    );

    // ── Composite Score ────────────────────────────────────────────────────────
    const totalScore = clamp(
      avail.score * WEIGHTS.availability +
        ins.score * WEIGHTS.insurance +
        priceResult.score * WEIGHTS.price +
        locationScore * WEIGHTS.location +
        deliveryScore * WEIGHTS.delivery +
        reliabilityScore * WEIGHTS.reliability +
        expirySafetyScore * WEIGHTS.expirySafety
    );

    // ── Reasons ────────────────────────────────────────────────────────────────
    const reasons: PharmacyRecommendationReason[] = [];
    const warnings: PharmacyRecommendationWarning[] = [];

    if (avail.availableCount === prescriptionItemIds.length) {
      reasons.push({ code: "has_all_medicines", label: "Has all medicines available" });
    } else {
      reasons.push({
        code: "partial_stock",
        label: `Has ${avail.availableCount} of ${prescriptionItemIds.length} medicines`,
      });
      warnings.push({
        code: "incomplete_stock",
        label: `${avail.unavailableIds.length} medicine(s) not available here`,
      });
    }

    if (patientInsurance !== "NONE" && pharmacy.acceptedInsurance.includes(patientInsurance)) {
      reasons.push({ code: "accepts_insurance", label: `Accepts your ${patientInsurance} insurance` });
    } else if (patientInsurance !== "NONE") {
      warnings.push({ code: "insurance_not_covered", label: `Does not accept ${patientInsurance}` });
    }

    if (distanceKm <= DISTANCE_NEAR) {
      reasons.push({ code: "closest_option", label: `${distanceKm.toFixed(1)} km away` });
    }

    if (priceResult.estimatedTotal > 0 && priceResult.score >= 80) {
      reasons.push({ code: "lowest_cost", label: "Competitive pricing in your area" });
    }

    if (deliveryScore === 100 && preferDelivery) {
      reasons.push({ code: "delivery_available", label: "Offers delivery to your location" });
    } else if (preferDelivery && deliveryScore === 0) {
      warnings.push({ code: "no_delivery", label: "No delivery — pickup only" });
    }

    if (reliabilityScore >= 90) {
      reasons.push({ code: "high_reliability", label: `${pharmacy.fulfillmentRate}% order fulfillment rate` });
    }

    if (avail.expirySoon.length > 0) {
      warnings.push({
        code: "expiry_soon",
        label: `${avail.expirySoon.length} medicine(s) expiring within 30 days — still safe but check with pharmacist`,
      });
    }

    scored.push({
      pharmacyId: pharmacy.id,
      pharmacyName: pharmacy.name,
      pharmacyAddress: pharmacy.address,
      pharmacyPhone: pharmacy.phone,
      totalScore: Math.round(totalScore),
      availabilityScore: Math.round(avail.score),
      insuranceScore: Math.round(ins.score),
      priceScore: Math.round(priceResult.score),
      locationScore: Math.round(locationScore),
      deliveryScore: Math.round(deliveryScore),
      reliabilityScore: Math.round(reliabilityScore),
      expirySafetyScore: Math.round(expirySafetyScore),
      reasons,
      warnings,
      estimatedTotalPrice: priceResult.estimatedTotal,
      estimatedDistance: Math.round(distanceKm * 10) / 10,
      estimatedDeliveryMinutes: estimateDeliveryMinutes(distanceKm),
      canFulfillCompletePrescription: avail.availableCount === prescriptionItemIds.length,
      availableItemCount: avail.availableCount,
      totalItemCount: prescriptionItemIds.length,
      insuranceSaving: ins.saving,
      rank: 1,
      _rawTotal: totalScore,
    });
  }

  // Sort by total score descending, take top 3
  scored.sort((a, b) => b._rawTotal - a._rawTotal);
  const top3 = scored.slice(0, 3);

  // Add "best overall" reason to #1 if it fulfills the complete prescription
  if (top3[0]?.canFulfillCompletePrescription) {
    top3[0].reasons.unshift({ code: "best_overall", label: "Best overall match for your prescription" });
  }
  if (top3[1] && top3[1].estimatedDeliveryMinutes < (top3[0]?.estimatedDeliveryMinutes ?? 999)) {
    top3[1].reasons.push({ code: "fastest_delivery", label: "Fastest estimated delivery" });
  }

  return top3.map((r, i) => {
    const { _rawTotal, ...result } = r;
    return { ...result, rank: (i + 1) as 1 | 2 | 3 };
  });
}

// ── Convenience wrapper using shared mock data ─────────────────────────────────
export function getPharmacyRecommendations({
  prescriptionItemIds,
  quantities,
  patientInsurance,
  patientLat,
  patientLng,
  preferDelivery,
  pharmacies,
  productListings,
  catalogueProducts,
}: RecommendationInput): PharmacyRecommendation[] {
  return recommendPharmacies({
    prescriptionItemIds,
    quantities,
    patientInsurance,
    patientLat,
    patientLng,
    preferDelivery,
    pharmacies,
    productListings,
    catalogueProducts,
  });
}
