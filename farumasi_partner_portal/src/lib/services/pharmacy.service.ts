import api from "@/lib/api";

export interface BackendPharmacy {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  license_number?: string | null;
  logo_url?: string | null;
  is_open: boolean;
  accepts_delivery?: boolean;
  verification_status?: string | null;
  status?: string | null;
  created_at?: string;
  commission_rate_percent?: number | null;
  effective_commission_rate_percent?: number | null;
  commission_rate_source?: string | null;
}

export interface PharmacyCreatePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  license_number?: string | null;
  logo_url?: string | null;
  accepts_delivery?: boolean;
  is_open?: boolean;
}

export interface PharmacyUpdatePayload extends Partial<PharmacyCreatePayload> {}

export const pharmacyService = {
  async getMine(): Promise<BackendPharmacy> {
    const { data } = await api.get<BackendPharmacy>("/pharmacies/me");
    return data;
  },

  async create(payload: PharmacyCreatePayload): Promise<BackendPharmacy> {
    const { data } = await api.post<BackendPharmacy>("/pharmacies/", payload);
    return data;
  },

  async updateMine(payload: PharmacyUpdatePayload): Promise<BackendPharmacy> {
    const { data } = await api.patch<BackendPharmacy>("/pharmacies/me", payload);
    return data;
  },
};
