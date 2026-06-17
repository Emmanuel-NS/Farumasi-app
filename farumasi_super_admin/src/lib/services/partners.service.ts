import api from "@/lib/api";

export interface PaginatedPartners {
  items: BackendPartner[];
  total: number;
  offset: number;
  limit: number;
}

export interface BackendPartner {
  id: string;
  name: string;
  company_type?: string | null;
  email?: string | null;
  phone?: string | null;
  district?: string | null;
  verification_status: string;
  status: string;
  is_open?: boolean;
  regulatory_license_number?: string | null;
  created_at: string;
}

export interface PartnerAdminUpdate {
  verification_status?: string;
  status?: string;
  commission_rate_percent?: number;
}

export const partnersService = {
  async getPartners(params?: { offset?: number; limit?: number }): Promise<{ items: BackendPartner[]; total: number }> {
    const { data } = await api.get<PaginatedPartners>("/partners/", {
      params: { limit: 50, ...params },
    });
    return { items: data.items, total: data.total };
  },

  async updatePartner(id: string, payload: PartnerAdminUpdate): Promise<BackendPartner> {
    const { data } = await api.put<BackendPartner>(`/partners/${id}`, payload);
    return data;
  },
};
