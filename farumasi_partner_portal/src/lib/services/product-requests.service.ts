import api from "@/lib/api";

export interface BackendProductRequest {
  id: string;
  requester_user_id: string;
  requester_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  product_name: string;
  category?: string | null;
  product_type: string;
  manufacturer?: string | null;
  brand?: string | null;
  description?: string | null;
  intended_use?: string | null;
  proposed_price?: number | null;
  documents_urls?: string[] | null;
  status: string;
  review_notes?: string | null;
  reviewed_by_pharmacist_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ProductRequestCreatePayload {
  product_name: string;
  category?: string | null;
  product_type: string;
  manufacturer?: string | null;
  brand?: string | null;
  description?: string | null;
  intended_use?: string | null;
  proposed_price?: number | null;
  documents_urls?: string[] | null;
}

export interface PaginatedProductRequests {
  items: BackendProductRequest[];
  total: number;
  offset: number;
  limit: number;
}

export const productRequestsService = {
  async list(params?: { status?: string; offset?: number; limit?: number }): Promise<PaginatedProductRequests> {
    const { data } = await api.get<PaginatedProductRequests>("/product-requests/", { params });
    return data;
  },

  async get(id: string): Promise<BackendProductRequest> {
    const { data } = await api.get<BackendProductRequest>(`/product-requests/${id}`);
    return data;
  },

  async create(payload: ProductRequestCreatePayload): Promise<BackendProductRequest> {
    const { data } = await api.post<BackendProductRequest>("/product-requests/", payload);
    return data;
  },

  async update(id: string, payload: Partial<ProductRequestCreatePayload>): Promise<BackendProductRequest> {
    const { data } = await api.patch<BackendProductRequest>(`/product-requests/${id}`, payload);
    return data;
  },

  async submit(id: string): Promise<BackendProductRequest> {
    const { data } = await api.patch<BackendProductRequest>(`/product-requests/${id}/submit`);
    return data;
  },
};
