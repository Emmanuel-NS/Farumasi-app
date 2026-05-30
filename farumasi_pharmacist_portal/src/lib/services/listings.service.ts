import api from "@/lib/api";
import type { BackendListing } from "./pharmacies.service";

export type ListingAvailability = "available" | "unavailable" | "out_of_stock" | "suspended";

export interface UpdateListingInput {
  price?: number;
  stock_quantity?: number;
  availability_status?: ListingAvailability;
  expiry_date?: string | null;
  batch_number?: string | null;
  fulfillment_time_minutes?: number;
}

export const listingsService = {
  async getListing(id: string): Promise<BackendListing> {
    const { data } = await api.get<BackendListing>(`/listings/${id}`);
    return data;
  },

  /** All listings for a specific product (cross-pharmacy view). */
  async getListingsForProduct(productId: string): Promise<BackendListing[]> {
    const { data } = await api.get<{ items: BackendListing[]; total: number }>("/listings/", {
      params: { product_id: productId, limit: 100 },
    });
    return data.items;
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
