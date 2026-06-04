import { api } from "@/lib/api";

export interface BackendProductRequest {
  id: string;
  requester_user_id: string;
  requester_type: string;
  partner_company_id?: string | null;
  pharmacy_id?: string | null;
  product_name: string;
  category?: string | null;
  product_type: string;
  manufacturer?: string | null;
  brand?: string | null;
  description?: string | null;
  intended_use?: string | null;
  proposed_price?: number | null;
  status: string;
  review_notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ProductRequestReviewPayload {
  status: "approved" | "rejected" | "more_info_required" | "under_review";
  review_notes?: string | null;
}

export const productRequestsService = {
  async list(params?: { status?: string; offset?: number; limit?: number }) {
    const { data } = await api.get<{ items: BackendProductRequest[]; total: number }>(
      "/product-requests/",
      { params },
    );
    return data;
  },

  async get(id: string) {
    const { data } = await api.get<BackendProductRequest>(`/product-requests/${id}`);
    return data;
  },

  async review(id: string, payload: ProductRequestReviewPayload) {
    const { data } = await api.patch<BackendProductRequest>(
      `/product-requests/${id}/review`,
      payload,
    );
    return data;
  },
};
