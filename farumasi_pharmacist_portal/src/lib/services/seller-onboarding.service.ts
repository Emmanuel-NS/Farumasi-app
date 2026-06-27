import api from "@/lib/api";

export interface DraftPharmacyInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  license_number?: string;
  license_document_url?: string;
  supervising_pharmacist_name?: string;
  supervising_pharmacist_license?: string;
}

export interface DraftPartnerInput {
  name: string;
  company_type?: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  business_registration_number?: string;
  regulatory_authority?: string;
  regulatory_license_number?: string;
  regulatory_license_document_url?: string;
}

export interface DraftSellerOut {
  pharmacy_id?: string;
  partner_company_id?: string;
  name: string;
}

export const sellerOnboardingService = {
  async draftPharmacy(input: DraftPharmacyInput): Promise<DraftSellerOut> {
    const { data } = await api.post<DraftSellerOut>("/pharmacists/onboard/pharmacy", input);
    return data;
  },

  async draftPartner(input: DraftPartnerInput): Promise<DraftSellerOut> {
    const { data } = await api.post<DraftSellerOut>("/pharmacists/onboard/partner", input);
    return data;
  },
};
