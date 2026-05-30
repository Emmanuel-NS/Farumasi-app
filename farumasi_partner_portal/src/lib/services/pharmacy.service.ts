import api from "@/lib/api";

export interface BackendPharmacy {
  id: string;
  name: string;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  license_number?: string | null;
  is_open: boolean;
  accepts_delivery: boolean;
  owner_user_id?: string | null;
  status?: string | null;
  verification_status?: string | null;
}

export interface PharmacyUpdatePayload {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_open?: boolean | null;
  accepts_delivery?: boolean | null;
}

export const pharmacyService = {
  async getMine(): Promise<BackendPharmacy> {
    const { data } = await api.get<BackendPharmacy>("/pharmacies/me");
    return data;
  },

  async updateMine(payload: PharmacyUpdatePayload): Promise<BackendPharmacy> {
    const { data } = await api.patch<BackendPharmacy>("/pharmacies/me", payload);
    return data;
  },
};
