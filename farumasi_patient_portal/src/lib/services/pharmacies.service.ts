import api from "@/lib/api";

export interface BackendPharmacy {
  id: string;
  name: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  is_open: boolean;
  accepts_delivery: boolean;
  created_at: string;
}

export interface PaginatedPharmacies {
  items: BackendPharmacy[];
  total: number;
  offset: number;
  limit: number;
}

export const pharmaciesService = {
  async listPharmacies(offset = 0, limit = 50): Promise<BackendPharmacy[]> {
    const { data } = await api.get<PaginatedPharmacies>("/pharmacies/", {
      params: { offset, limit },
    });
    return data.items;
  },
};
