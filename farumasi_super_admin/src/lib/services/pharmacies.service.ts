import api from "@/lib/api";
import type { Pharmacy } from "@/types";

export interface BackendPharmacy {
  id: string;
  name: string;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  phone?: string | null;
  status: string;
  is_verified: boolean;
  is_embedded?: boolean;
  created_at: string;
  verified_at?: string | null;
  owner?: { id: string; full_name: string; email: string } | null;
}

export interface PaginatedPharmacies {
  items: BackendPharmacy[];
  total: number;
  offset: number;
  limit: number;
}

function adapt(p: BackendPharmacy): Pharmacy {
  const statusMap: Record<string, string> = {
    active: "Approved", pending: "Pending", suspended: "Suspended", inactive: "Suspended",
  };
  return {
    id: p.id,
    name: p.name,
    code: p.id.slice(0, 8).toUpperCase(),
    location: p.address ?? "",
    district: p.district ?? "",
    province: p.province ?? "",
    status: (statusMap[p.status] ?? "Pending") as Pharmacy["status"],
    stockLevel: "Good",
    fulfillmentRate: 0,
    totalFulfillments: 0,
    balance: 0,
    lastActivity: p.verified_at ?? p.created_at,
    adminName: p.owner?.full_name ?? "",
    adminEmail: p.owner?.email ?? "",
    phone: p.phone ?? "",
    isEmbedded: p.is_embedded ?? false,
    createdAt: p.created_at,
    verifiedAt: p.verified_at ?? undefined,
  };
}

export const pharmaciesService = {
  async getPharmacies(params?: { offset?: number; limit?: number; search?: string }): Promise<{ items: Pharmacy[]; total: number }> {
    const { data } = await api.get<PaginatedPharmacies>("/pharmacies/", { params: { limit: 50, ...params } });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getPharmacyById(id: string): Promise<Pharmacy> {
    const { data } = await api.get<BackendPharmacy>(`/pharmacies/${id}`);
    return adapt(data);
  },
};
