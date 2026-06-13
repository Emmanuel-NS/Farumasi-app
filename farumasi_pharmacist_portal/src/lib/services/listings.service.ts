import api from "@/lib/api";
import { type BackendListing } from "./pharmacies.service";
export type { BackendListing };

/** Build id→name map from nested listing payloads (no separate /pharmacies call). */
export function buildPharmacyMapFromListings(listings: BackendListing[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const l of listings) {
    if (l.pharmacy?.id) map.set(l.pharmacy.id, l.pharmacy.name);
    if (l.partner_company?.id) map.set(l.partner_company.id, l.partner_company.name);
  }
  return map;
}

export function listingSellerName(
  listing: BackendListing,
  pharmacyMap?: Map<string, string>,
): string {
  if (listing.pharmacy?.name) return listing.pharmacy.name;
  if (listing.partner_company?.name) return listing.partner_company.name;
  if (listing.pharmacy_id) return pharmacyMap?.get(listing.pharmacy_id) ?? "Unknown Pharmacy";
  return "Partner Wholesale";
}

export type ListingAvailability = "available" | "unavailable" | "out_of_stock" | "suspended";

export interface UpdateListingInput {
  price?: number;
  unit_price?: number | null;
  stock_quantity?: number;
  availability_status?: ListingAvailability;
  expiry_date?: string | null;
  batch_number?: string | null;
  fulfillment_time_minutes?: number;
}

export interface UpdateMyListingInput extends UpdateListingInput {}

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
    const { data } = await api.patch<BackendListing>(`/pharmacies/me/listings/${id}`, input);
    return data;
  },

  async updateMyListing(id: string, input: UpdateMyListingInput): Promise<BackendListing> {
    return this.updateListing(id, input);
  },

  async setAvailability(id: string, availability_status: ListingAvailability): Promise<BackendListing> {
    const { data } = await api.patch<BackendListing>(`/listings/${id}/availability`, { availability_status });
    return data;
  },

  async deleteListing(id: string): Promise<void> {
    await api.delete(`/listings/${id}`);
  },
};
