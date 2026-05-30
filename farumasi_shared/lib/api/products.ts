import { getClient } from "./client";
import type {
  InsuranceProviderOut,
  PaginatedResponse,
  ProductListingOut,
  ProductOut,
} from "./types";

export const productsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    category?: string;
    status?: string;
  }) => getClient().get<PaginatedResponse<ProductOut>>("/products/", { params }),

  getById: (id: string) => getClient().get<ProductOut>(`/products/${id}`),

  create: (payload: Partial<ProductOut>) => getClient().post<ProductOut>("/products/", payload),
  update: (id: string, payload: Partial<ProductOut>) =>
    getClient().patch<ProductOut>(`/products/${id}`, payload),
  setStatus: (id: string, status: string) =>
    getClient().patch<ProductOut>(`/products/${id}/status`, { status }),
};

export const categoriesApi = {
  /** All categories ordered by display_order. No auth required. */
  list: () =>
    getClient().get<{ id: string; name: string; icon_name: string; is_default: boolean; display_order: number; created_at: string }[]>(
      "/products/categories/",
    ),

  create: (payload: { name: string; icon_name: string; display_order?: number }) =>
    getClient().post("/products/categories/", payload),

  update: (id: string, payload: { name?: string; icon_name?: string; display_order?: number }) =>
    getClient().patch(`/products/categories/${id}`, payload),

  delete: (id: string) =>
    getClient().delete(`/products/categories/${id}`),

  /** Bulk upsert from pharmacist localStorage → backend. */
  sync: (items: { name: string; icon_name: string; display_order: number }[]) =>
    getClient().put("/products/categories/sync", items),
};

export const listingsApi = {
  search: (params: {
    product_id?: string;
    latitude?: number;
    longitude?: number;
    radius_km?: number;
    insurance_id?: string;
    page?: number;
    page_size?: number;
  }) => getClient().get<PaginatedResponse<ProductListingOut>>("/listings/", { params }),
  getById: (id: string) => getClient().get<ProductListingOut>(`/listings/${id}`),
  update: (id: string, payload: Partial<ProductListingOut>) =>
    getClient().patch<ProductListingOut>(`/listings/${id}`, payload),
  setAvailability: (id: string, availability_status: string) =>
    getClient().patch<ProductListingOut>(`/listings/${id}/availability`, { availability_status }),
  delete: (id: string) => getClient().delete<void>(`/listings/${id}`),
};

export const insuranceApi = {
  list: () => getClient().get<PaginatedResponse<InsuranceProviderOut>>("/insurance-providers/"),
  getById: (id: string) => getClient().get<InsuranceProviderOut>(`/insurance-providers/${id}`),
};
