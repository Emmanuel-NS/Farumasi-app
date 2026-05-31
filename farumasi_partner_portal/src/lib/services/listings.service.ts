import api from "@/lib/api";

export interface BackendProduct {
  id: string;
  name: string;
  generic_name?: string | null;
  category?: string | null;
  product_type: string;
  description?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  country_of_origin?: string | null;
  prescription_required: boolean;
  regulatory_status?: string | null;
  approval_status: string;
  image_url?: string | null;
  created_at: string;
  price_from?: number | null;
  listing_count?: number | null;
}

export interface BackendListing {
  id: string;
  product_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  price: number;
  stock_quantity: number;
  availability_status: string;
  expiry_date?: string | null;
  batch_number?: string | null;
  accepted_insurance_ids?: string[] | null;
  delivery_options?: string[] | null;
  fulfillment_time_minutes: number;
  location_latitude?: number | null;
  location_longitude?: number | null;
  status: string;
  created_at: string;
  product?: BackendProduct;
}

export interface PaginatedProducts {
  items: BackendProduct[];
  total: number;
  offset: number;
  limit: number;
}

export interface PaginatedListings {
  items: BackendListing[];
  total: number;
  offset: number;
  limit: number;
}

export type ListingAvailability = "available" | "unavailable" | "out_of_stock";

export interface CreateListingInput {
  product_id: string;
  price: number;
  stock_quantity: number;
  availability_status?: ListingAvailability;
  expiry_date?: string | null;
  batch_number?: string | null;
  fulfillment_time_minutes?: number;
}

export interface UpdateListingInput {
  price?: number;
  stock_quantity?: number;
  availability_status?: ListingAvailability;
  expiry_date?: string | null;
  batch_number?: string | null;
  fulfillment_time_minutes?: number;
}

export const listingsService = {
  async listApprovedProducts(params?: {
    offset?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<PaginatedProducts> {
    const { data } = await api.get<PaginatedProducts>("/products/", {
      params: { only_with_listings: false, ...params },
    });
    return data;
  },

  async listMyListings(params?: { offset?: number; limit?: number }): Promise<PaginatedListings> {
    const { data } = await api.get<PaginatedListings>("/partners/me/listings", { params });
    return data;
  },

  async createListing(input: CreateListingInput): Promise<BackendListing> {
    const { data } = await api.post<BackendListing>("/partners/me/listings", input);
    return data;
  },

  async getListing(id: string): Promise<BackendListing> {
    const { data } = await api.get<BackendListing>(`/listings/${id}`);
    return data;
  },

  async updateListing(id: string, input: UpdateListingInput): Promise<BackendListing> {
    const { data } = await api.patch<BackendListing>(`/listings/${id}`, input);
    return data;
  },

  async setAvailability(id: string, availability_status: ListingAvailability): Promise<BackendListing> {
    const { data } = await api.patch<BackendListing>(`/listings/${id}/availability`, { availability_status });
    return data;
  },

  async deleteListing(id: string): Promise<void> {
    await api.delete(`/listings/${id}`);
  },
};
