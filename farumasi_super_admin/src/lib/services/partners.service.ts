import api from "@/lib/api";

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
  created_at: string;
}

export interface PaginatedPartners {
  items: BackendPartner[];
  total: number;
  offset: number;
  limit: number;
}

export const partnersService = {
  async getPartners(params?: { offset?: number; limit?: number }): Promise<{ items: BackendPartner[]; total: number }> {
    const { data } = await api.get<PaginatedPartners>("/partners/", {
      params: { limit: 50, ...params },
    });
    return { items: data.items, total: data.total };
  },
};
