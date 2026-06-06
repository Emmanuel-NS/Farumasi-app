import api from "@/lib/api";

export interface BackendPartnerCompany {
  id: string;
  owner_user_id: string;
  name: string;
  company_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_registration_number?: string | null;
  logo_url?: string | null;
  description?: string | null;
  commission_rate_percent?: number | null;
  effective_commission_rate_percent?: number | null;
  commission_rate_source?: string | null;
  is_open: boolean;
  verification_status: string;
  status: string;
  created_at: string;
}

export interface PartnerCompanyUpdatePayload {
  name?: string | null;
  company_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_registration_number?: string | null;
  logo_url?: string | null;
  description?: string | null;
  is_open?: boolean | null;
}

export interface PartnerCompanyCreatePayload {
  name: string;
  company_type?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  business_registration_number?: string | null;
}

export const partnerService = {
  async getMine(): Promise<BackendPartnerCompany> {
    const { data } = await api.get<BackendPartnerCompany>("/partners/me");
    return data;
  },

  async updateMine(payload: PartnerCompanyUpdatePayload): Promise<BackendPartnerCompany> {
    const { data } = await api.patch<BackendPartnerCompany>("/partners/me", payload);
    return data;
  },

  async create(payload: PartnerCompanyCreatePayload): Promise<BackendPartnerCompany> {
    const { data } = await api.post<BackendPartnerCompany>("/partners/", payload);
    return data;
  },
};
