import type { Recommendation, RecommendationResponse } from "@/types";

export interface BackendRecommendedProvider {
  id?: string | null;
  rank: number;
  provider_type: "pharmacy" | "partner";
  provider_id: string;
  provider_name: string;
  total_score: number;
  availability_score: number;
  insurance_score: number;
  price_score: number;
  location_score: number;
  delivery_score: number;
  reliability_score: number;
  expiry_safety_score: number;
  estimated_total_price?: number | null;
  estimated_distance_km?: number | null;
  can_fulfill_complete_prescription: boolean;
  available_items_count: number;
  total_items_count: number;
  reasons: string[];
  warnings: string[];
}

export interface BackendRecommendationResponse {
  prescription_id?: string | null;
  top_recommendations: BackendRecommendedProvider[];
  total_candidates_evaluated: number;
}

export function adaptRecommendation(r: BackendRecommendedProvider): Recommendation {
  return {
    id: r.id ?? undefined,
    rank: r.rank,
    providerType: r.provider_type,
    providerId: r.provider_id,
    providerName: r.provider_name,
    totalScore: r.total_score,
    availabilityScore: r.availability_score,
    insuranceScore: r.insurance_score,
    priceScore: r.price_score,
    locationScore: r.location_score,
    deliveryScore: r.delivery_score,
    reliabilityScore: r.reliability_score,
    expirySafetyScore: r.expiry_safety_score,
    estimatedTotalPrice: r.estimated_total_price ?? null,
    estimatedDistanceKm: r.estimated_distance_km ?? null,
    canFulfillCompletePrescription: r.can_fulfill_complete_prescription,
    availableItemsCount: r.available_items_count,
    totalItemsCount: r.total_items_count,
    reasons: r.reasons ?? [],
    warnings: r.warnings ?? [],
  };
}

export function adaptRecommendationResponse(
  res: BackendRecommendationResponse,
): RecommendationResponse {
  return {
    prescriptionId: res.prescription_id ?? undefined,
    topRecommendations: (res.top_recommendations ?? []).map(adaptRecommendation),
    totalCandidatesEvaluated: res.total_candidates_evaluated ?? 0,
  };
}
