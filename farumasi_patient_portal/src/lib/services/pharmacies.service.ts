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
  image_url?: string | null;
}

export interface BackendListing {
  id: string;
  product_id: string;
  pharmacy_id: string | null;
  partner_company_id: string | null;
  price: number;
  unit_price?: number | null;
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
    // API caps limit at 100
    const safeLimit = Math.min(limit, 100);
    const { data } = await api.get<PaginatedPharmacies>("/pharmacies/", {
      params: { offset, limit: safeLimit },
    });
    return data.items;
  },

  /** Fetch all active listings (available or low_stock) for a given product. */
  async listingsForProduct(productId: string): Promise<BackendListing[]> {
    const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
      params: { product_id: productId, limit: 100 },
    });
    return data.items.filter(
      (l) =>
        l.status === "active" &&
        (l.availability_status === "available" || l.availability_status === "low_stock")
    );
  },

  /** Fetch all active listings for a specific pharmacy (for pharmacy filter on store page). */
  async listingsForPharmacy(pharmacyId: string): Promise<BackendListing[]> {
    const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
      params: { pharmacy_id: pharmacyId, limit: 100 },
    });
    return data.items.filter(
      (l) =>
        l.status === "active" &&
        (l.availability_status === "available" || l.availability_status === "low_stock")
    );
  },

  /**
   * Returns the set of pharmacy IDs that have at least one available/low_stock active listing.
   * Paginates through all listings (API max 100 per page) to collect all.
   */
  async listActivePharmacyIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    let offset = 0;
    const pageSize = 100;
    while (true) {
      const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
        params: { limit: pageSize, offset },
      });
      for (const l of data.items) {
        if (
          l.pharmacy_id &&
          l.status === "active" &&
          (l.availability_status === "available" || l.availability_status === "low_stock")
        ) {
          ids.add(l.pharmacy_id);
        }
      }
      if (data.items.length < pageSize || offset + pageSize >= data.total) break;
      offset += pageSize;
    }
    return ids;
  },
};
