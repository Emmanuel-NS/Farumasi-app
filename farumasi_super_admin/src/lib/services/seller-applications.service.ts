import api from "@/lib/api";

export interface SellerApplication {
  id: string;
  application_code: string;
  seller_type: string;
  status: string;
  business_name: string;
  owner_full_name: string;
  owner_email: string;
  owner_phone?: string | null;
  district?: string | null;
  payload: Record<string, unknown>;
  review_notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export const sellerApplicationsService = {
  async list(params?: { status?: string; seller_type?: string; offset?: number; limit?: number }) {
    const { data } = await api.get<{ items: SellerApplication[]; total: number }>(
      "/seller-applications/",
      { params },
    );
    return data;
  },

  async review(id: string, input: { status: "approved" | "rejected" | "under_review"; review_notes?: string }) {
    const { data } = await api.patch<SellerApplication>(`/seller-applications/${id}/review`, input);
    return data;
  },
};
