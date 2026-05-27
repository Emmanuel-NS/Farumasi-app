import api from "@/lib/api";

export interface BackendPharmacy {
  id: string;
  name: string;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_open?: boolean;
  accepts_delivery?: boolean;
  status?: string;
  verification_status?: string;
  owner_user_id?: string;
}

export interface UpdatePharmacyInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_open?: boolean;
  accepts_delivery?: boolean;
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
}

export interface PaginatedListings {
  items: BackendListing[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateListingInput {
  product_id: string;
  price: number;
  stock_quantity: number;
  availability_status?: "available" | "unavailable" | "out_of_stock";
  expiry_date?: string | null;
  batch_number?: string | null;
  fulfillment_time_minutes?: number;
}

export const pharmaciesService = {
  async getMyPharmacy(): Promise<BackendPharmacy> {
    const { data } = await api.get<BackendPharmacy>("/pharmacies/me");
    return data;
  },

  async updateMyPharmacy(input: UpdatePharmacyInput): Promise<BackendPharmacy> {
    const { data } = await api.patch<BackendPharmacy>("/pharmacies/me", input);
    return data;
  },

  async getMyListings(params?: { offset?: number; limit?: number }): Promise<PaginatedListings> {
    const { data } = await api.get<PaginatedListings>("/pharmacies/me/listings", { params });
    return data;
  },

  async createMyListing(input: CreateListingInput): Promise<BackendListing> {
    const { data } = await api.post<BackendListing>("/pharmacies/me/listings", input);
    return data;
  },
};
