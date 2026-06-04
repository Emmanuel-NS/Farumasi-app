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
  sellerKind?: "pharmacy" | "partner";
}

export interface ListingPharmacyBrief {
  id: string;
  name: string;
  district?: string | null;
  image_url?: string | null;
  is_open?: boolean;
  accepts_delivery?: boolean;
}

export interface ListingPartnerBrief {
  id: string;
  name: string;
  company_type?: string | null;
  district?: string | null;
  logo_url?: string | null;
  description?: string | null;
  is_open?: boolean;
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
  pharmacy?: ListingPharmacyBrief | null;
  partner_company?: ListingPartnerBrief | null;
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

  /** Fetch active listings for a pharmacy or partner company (store filter). */
  async listingsForSeller(sellerId: string, kind: "pharmacy" | "partner"): Promise<BackendListing[]> {
    const params =
      kind === "pharmacy"
        ? { pharmacy_id: sellerId, limit: 100 }
        : { partner_company_id: sellerId, limit: 100 };
    const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
      params,
    });
    return data.items.filter(
      (l) =>
        l.status === "active" &&
        (l.availability_status === "available" || l.availability_status === "low_stock"),
    );
  },

  async listingsForPharmacy(pharmacyId: string): Promise<BackendListing[]> {
    return this.listingsForSeller(pharmacyId, "pharmacy");
  },

  /**
   * Pharmacy and partner company IDs with at least one available active listing.
   */
  async listActiveSellerIds(): Promise<{ pharmacyIds: Set<string>; partnerIds: Set<string> }> {
    const pharmacyIds = new Set<string>();
    const partnerIds = new Set<string>();
    let offset = 0;
    const pageSize = 100;
    const maxPages = 20;
    for (let page = 0; page < maxPages; page += 1) {
      const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
        params: { limit: pageSize, offset },
      });
      for (const l of data.items) {
        if (
          l.status !== "active" ||
          !(l.availability_status === "available" || l.availability_status === "low_stock")
        ) {
          continue;
        }
        if (l.pharmacy_id) pharmacyIds.add(l.pharmacy_id);
        if (l.partner_company_id) partnerIds.add(l.partner_company_id);
      }
      const total = data.total ?? data.items.length;
      if (data.items.length < pageSize || offset + pageSize >= total) break;
      offset += pageSize;
    }
    return { pharmacyIds, partnerIds };
  },

  /** @deprecated Use listActiveSellerIds */
  async listActivePharmacyIds(): Promise<Set<string>> {
    const { pharmacyIds } = await this.listActiveSellerIds();
    return pharmacyIds;
  },
};
