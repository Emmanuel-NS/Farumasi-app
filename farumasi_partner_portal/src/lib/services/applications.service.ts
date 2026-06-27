import api from "@/lib/api";

export interface PharmacyDraft {
  id: string;
  name: string;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  license_number?: string | null;
  license_document_url?: string | null;
  supervising_pharmacist_name?: string | null;
  supervising_pharmacist_license?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PartnerDraft {
  id: string;
  name: string;
  company_type?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  business_registration_number?: string | null;
  regulatory_authority?: string | null;
  regulatory_license_number?: string | null;
  regulatory_license_document_url?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ApplicationSubmitInput {
  seller_type: "pharmacy" | "partner";
  source_pharmacy_id?: string | null;
  source_partner_id?: string | null;
  owner_full_name: string;
  owner_email: string;
  owner_phone?: string;
  password: string;
  business_name: string;
  payload: Record<string, unknown>;
}

export interface ApplicationSubmitResponse {
  message: string;
  application_id: string;
  application_code: string;
  email: string;
  expires_minutes: number;
}

export const applicationsService = {
  async listPharmacyDrafts(): Promise<PharmacyDraft[]> {
    const { data } = await api.get<PharmacyDraft[]>("/seller-applications/drafts/pharmacies");
    return data;
  },

  async listPartnerDrafts(): Promise<PartnerDraft[]> {
    const { data } = await api.get<PartnerDraft[]>("/seller-applications/drafts/partners");
    return data;
  },

  async submit(input: ApplicationSubmitInput): Promise<ApplicationSubmitResponse> {
    const { data } = await api.post<ApplicationSubmitResponse>("/seller-applications/submit", input);
    return data;
  },

  async verify(applicationId: string, email: string, code: string) {
    const { data } = await api.post<{ access_token: string; refresh_token: string }>(
      "/seller-applications/verify",
      { application_id: applicationId, email, code },
    );
    return data;
  },

  async getMine() {
    const { data } = await api.get<{
      id: string;
      application_code: string;
      status: string;
      seller_type: string;
      business_name: string;
      review_notes?: string | null;
    } | null>("/seller-applications/me");
    return data;
  },
};
