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
  information_source_url?: string | null;
  created_at: string;
  price_from?: number | null;
  price_to?: number | null;
  listing_count?: number | null;
  packaging_class?: string | null;
  allows_partial_selling?: boolean;
  units_per_pack?: number | null;
  min_partial_quantity?: number | null;
  partial_unit_name?: string | null;
}

export interface PaginatedProducts {
  items: BackendProduct[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateProductInput {
  name: string;
  generic_name?: string | null;
  category?: string | null;
  product_type?: "medicine" | "medical_device" | "food_supplements" | "cosmetics";
  description?: string | null;
  dosage_form?: string | null;
  strength?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  prescription_required?: boolean;
  image_url?: string | null;
  information_source_url?: string | null;
  /** Packaging & partial selling */
  packaging_class?: string | null;
  units_per_pack?: number | null;
  min_partial_quantity?: number | null;
  partial_unit_name?: string | null;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export type ProductApprovalStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended"
  | "withdrawn";

export const productsService = {
  async searchProducts(params?: {
    search?: string;
    category?: string;
    offset?: number;
    limit?: number;
    only_with_listings?: boolean;
    include_unapproved?: boolean;
  }): Promise<PaginatedProducts> {
    const { data } = await api.get<PaginatedProducts>("/products", {
      params: { only_with_listings: false, ...params },
    });
    return data;
  },

  async getProduct(id: string): Promise<BackendProduct> {
    const { data } = await api.get<BackendProduct>(`/products/${id}`);
    return data;
  },

  async createProduct(input: CreateProductInput): Promise<BackendProduct> {
    const { data } = await api.post<BackendProduct>("/products", input);
    return data;
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<BackendProduct> {
    const { data } = await api.patch<BackendProduct>(`/products/${id}`, input);
    return data;
  },

  async setProductStatus(
    id: string,
    approval_status: ProductApprovalStatus,
  ): Promise<BackendProduct> {
    const { data } = await api.patch<BackendProduct>(`/products/${id}/status`, {
      approval_status,
    });
    return data;
  },

  /** Soft-delete: sets approval_status to withdrawn and suspends listings. */
  async deleteProduct(id: string): Promise<BackendProduct> {
    const { data } = await api.delete<BackendProduct>(`/products/${id}`);
    return data;
  },
};
