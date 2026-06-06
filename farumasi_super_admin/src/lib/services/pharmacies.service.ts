import api from "@/lib/api";
import type { Pharmacy } from "@/types";

export interface BackendPharmacyOwner {
  id: string;
  full_name: string;
  email: string;
}

export interface BackendPharmacy {
  id: string;
  name: string;
  address?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  owner_user_id?: string | null;
  status?: string | null;
  verification_status?: string | null;
  is_open?: boolean;
  accepts_delivery?: boolean;
  created_at: string;
  updated_at?: string | null;
  owner?: BackendPharmacyOwner | null;
}

export interface PaginatedPharmacies {
  items: BackendPharmacy[];
  total: number;
  offset: number;
  limit: number;
}

function entityStatusLabel(status?: string | null): string {
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  if (status === "inactive") return "Inactive";
  return status ?? "Unknown";
}

function adapt(p: BackendPharmacy): Pharmacy & { entityStatus: string; verificationStatus: string; storeOpen: boolean } {
  return {
    id: p.id,
    name: p.name,
    code: p.id.slice(0, 8).toUpperCase(),
    location: p.address ?? "",
    district: p.district ?? "",
    province: "",
    status: (p.verification_status === "verified" ? "Approved" : "Pending") as Pharmacy["status"],
    stockLevel: "Good",
    fulfillmentRate: 0,
    totalFulfillments: 0,
    balance: 0,
    lastActivity: p.updated_at ?? p.created_at,
    adminName: p.owner?.full_name ?? "",
    adminEmail: p.owner?.email ?? p.email ?? "",
    phone: p.phone ?? "",
    isEmbedded: false,
    createdAt: p.created_at,
    verifiedAt: p.verification_status === "verified" ? p.updated_at ?? undefined : undefined,
    entityStatus: entityStatusLabel(p.status),
    verificationStatus: p.verification_status ?? "unverified",
    storeOpen: p.is_open !== false,
  };
}

export type AdminPharmacyRow = ReturnType<typeof adapt>;

export const pharmaciesService = {
  async getPharmacies(params?: {
    offset?: number;
    limit?: number;
  }): Promise<{ items: AdminPharmacyRow[]; total: number }> {
    const { data } = await api.get<PaginatedPharmacies>("/pharmacies/", {
      params: { limit: 100, ...params },
    });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getPharmacyById(id: string): Promise<AdminPharmacyRow> {
    const { data } = await api.get<BackendPharmacy>(`/pharmacies/${id}`);
    return adapt(data);
  },
};
