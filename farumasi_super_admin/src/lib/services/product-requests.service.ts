import api from "@/lib/api";
import type { ProductRequest } from "@/types";

export interface BackendProductRequest {
  id: string;
  product_name: string;
  generic_name?: string | null;
  category?: string | null;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  requester?: { id: string; user?: { id: string; full_name: string } | null } | null;
  pharmacy?: { id: string; name: string } | null;
}

export interface PaginatedProductRequests {
  items: BackendProductRequest[];
  total: number;
  offset: number;
  limit: number;
}

const STATUS_MAP: Record<string, ProductRequest["status"]> = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  requires_info: "Requires More Information", approved: "Approved",
  rejected: "Rejected", suspended: "Suspended",
};

function adapt(r: BackendProductRequest): ProductRequest {
  return {
    id: r.id,
    productName: r.product_name,
    genericName: r.generic_name ?? undefined,
    category: r.category ?? "General",
    requestedById: r.requester?.id ?? "",
    requestedByName: r.requester?.user?.full_name ?? r.pharmacy?.name ?? "Unknown",
    requestedByType: r.pharmacy ? "Pharmacy" : "Supplier",
    status: STATUS_MAP[r.status] ?? "Submitted",
    submittedAt: r.created_at,
    reviewedAt: r.reviewed_at ?? undefined,
    reviewedBy: r.reviewed_by ?? undefined,
    notes: r.notes ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    documents: [],
    priority: "Normal",
  };
}

export const productRequestsService = {
  async getProductRequests(params?: { offset?: number; limit?: number; status?: string }): Promise<{ items: ProductRequest[]; total: number }> {
    const { data } = await api.get<PaginatedProductRequests>("/product-requests/", { params: { limit: 50, ...params } });
    return { items: data.items.map(adapt), total: data.total };
  },

  async review(id: string, action: "approve" | "reject", notes?: string): Promise<ProductRequest> {
    const { data } = await api.patch<BackendProductRequest>(`/product-requests/${id}/review`, {
      status: action === "approve" ? "approved" : "rejected",
      notes,
    });
    return adapt(data);
  },
};
