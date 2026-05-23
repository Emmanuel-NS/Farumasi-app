import { getClient } from "./client";
import type { RecommendationResponse } from "./types";

export interface PharmacyRecommendationRequest {
  prescription_id: string;
  latitude: number;
  longitude: number;
  insurance_provider_id?: string;
  max_results?: number;
}

export const recommendationsApi = {
  pharmacies: (payload: PharmacyRecommendationRequest) =>
    getClient().post<RecommendationResponse>("/recommendations/pharmacies", payload),
};
