import api from "@/lib/api";
import { isMockMode } from "@/lib/env";
import {
  adaptRecommendationResponse,
  type BackendRecommendationResponse,
} from "@/lib/mappers/recommendations.mapper";
import type { Recommendation, RecommendationResponse } from "@/types";

export interface RecommendationQuery {
  lat: number;
  lon: number;
  preferredDelivery?: boolean;
}

// ── Mock fallback (used only when NEXT_PUBLIC_USE_MOCK=true) ────────────────
function mockRecommendations(prescriptionId: string): RecommendationResponse {
  const base: Omit<Recommendation, "rank" | "providerId" | "providerName" | "estimatedTotalPrice" | "estimatedDistanceKm"> = {
    providerType: "pharmacy",
    totalScore: 0,
    availabilityScore: 0.9,
    insuranceScore: 0.7,
    priceScore: 0.8,
    locationScore: 0.85,
    deliveryScore: 0.8,
    reliabilityScore: 0.9,
    expirySafetyScore: 0.95,
    canFulfillCompletePrescription: true,
    availableItemsCount: 3,
    totalItemsCount: 3,
    reasons: ["All medicines in stock", "Close to your location", "Accepts your insurance"],
    warnings: [],
  };
  return {
    prescriptionId,
    totalCandidatesEvaluated: 8,
    topRecommendations: [
      { ...base, rank: 1, providerId: "mock-1", providerName: "FARUMASI Kigali Central", totalScore: 0.92, estimatedTotalPrice: 12500, estimatedDistanceKm: 1.4 },
      { ...base, rank: 2, providerId: "mock-2", providerName: "Kacyiru Family Pharmacy", totalScore: 0.87, estimatedTotalPrice: 13200, estimatedDistanceKm: 2.8, warnings: ["1 item may need substitution"] },
      { ...base, rank: 3, providerId: "mock-3", providerName: "Remera Health Pharmacy",  totalScore: 0.81, estimatedTotalPrice: 11900, estimatedDistanceKm: 3.6, availableItemsCount: 2, canFulfillCompletePrescription: false, warnings: ["1 of 3 medicines unavailable"] },
    ],
  };
}

export const recommendationsService = {
  /**
   * GET /api/v1/patients/me/prescriptions/{id}/recommendations
   * Returns the top-N (typically 3) provider recommendations for a given
   * prescription, scored against the patient's location and preferences.
   */
  async getForPrescription(
    prescriptionId: string,
    { lat, lon, preferredDelivery = false }: RecommendationQuery,
  ): Promise<RecommendationResponse> {
    if (isMockMode()) {
      return mockRecommendations(prescriptionId);
    }
    const { data } = await api.get<BackendRecommendationResponse>(
      `/patients/me/prescriptions/${prescriptionId}/recommendations`,
      { params: { lat, lon, preferred_delivery: preferredDelivery } },
    );
    return adaptRecommendationResponse(data);
  },
};
