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

export interface BackendListing {
  id: string;
  product_id: string;
  pharmacy_id: string | null;
  partner_company_id: string | null;
  price: number;
  stock_quantity: number;
  availability_status: string;
  fulfillment_time_minutes: number;
  expiry_date: string | null;
  status: string;
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

  /** Fetch all active listings (available or low_stock) for a given product. */
  async listingsForProduct(productId: string): Promise<BackendListing[]> {
    const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
      params: { product_id: productId, limit: 50 },
    });
    return data.items.filter(
      (l) =>
        l.status === "active" &&
        (l.availability_status === "available" || l.availability_status === "low_stock")
    );
  },
};
