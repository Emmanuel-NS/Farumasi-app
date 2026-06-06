import api from "@/lib/api";

export interface SellerChangeRequest {
  id: string;
  seller_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  seller_name?: string | null;
  field_name: string;
  field_label: string;
  current_value?: string | null;
  proposed_value: string;
  status: string;
  admin_note?: string | null;
  partner_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export const sellerChangeRequestsService = {
  async listPending(): Promise<SellerChangeRequest[]> {
    const { data } = await api.get<SellerChangeRequest[]>("/sellers/me/change-requests", {
      params: { scope: "pending" },
    });
    return data;
  },

  async listAll(): Promise<SellerChangeRequest[]> {
    const { data } = await api.get<SellerChangeRequest[]>("/sellers/me/change-requests", {
      params: { scope: "all" },
    });
    return data;
  },

  async approve(id: string, partnerNote?: string): Promise<SellerChangeRequest> {
    const { data } = await api.post<SellerChangeRequest>(
      `/sellers/me/change-requests/${id}/approve`,
      { partner_note: partnerNote ?? undefined },
    );
    return data;
  },

  async reject(id: string, partnerNote?: string): Promise<SellerChangeRequest> {
    const { data } = await api.post<SellerChangeRequest>(
      `/sellers/me/change-requests/${id}/reject`,
      { partner_note: partnerNote ?? undefined },
    );
    return data;
  },
};
