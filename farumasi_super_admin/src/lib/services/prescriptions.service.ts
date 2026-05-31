import api from "@/lib/api";
import type { PrescriptionRecord } from "@/types";

export interface BackendPrescription {
  id: string;
  status: string;
  priority?: string | null;
  created_at: string;
  fulfilled_at?: string | null;
  patient?: { id: string; user?: { id: string; full_name: string } | null } | null;
  doctor?: { id: string; user?: { id: string; full_name: string } | null } | null;
  hospital?: { id: string; name: string } | null;
  pharmacy?: { id: string; name: string } | null;
  items?: unknown[];
}

export interface PaginatedPrescriptions {
  items: BackendPrescription[];
  total: number;
  offset: number;
  limit: number;
}

const STATUS_MAP: Record<string, PrescriptionRecord["status"]> = {
  pending: "Pending", sent: "Sent", partially_fulfilled: "Partially Fulfilled",
  fulfilled: "Fulfilled", failed: "Failed", expired: "Expired",
};

function adapt(p: BackendPrescription): PrescriptionRecord {
  return {
    id: p.id,
    patientName: p.patient?.user?.full_name ?? "Unknown",
    doctorName: p.doctor?.user?.full_name ?? "Unknown",
    hospitalName: p.hospital?.name,
    pharmacyName: p.pharmacy?.name,
    status: STATUS_MAP[p.status] ?? "Pending",
    priority: (p.priority === "urgent" ? "Urgent" : p.priority === "high" ? "High" : "Normal") as PrescriptionRecord["priority"],
    items: Array.isArray(p.items) ? p.items.length : 0,
    createdAt: p.created_at,
    fulfilledAt: p.fulfilled_at ?? undefined,
  };
}

export const prescriptionsService = {
  async getPrescriptions(params?: { offset?: number; limit?: number; status?: string }): Promise<{ items: PrescriptionRecord[]; total: number }> {
    const { data } = await api.get<PaginatedPrescriptions>("/prescriptions/", { params: { limit: 50, ...params } });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getPrescriptionById(id: string): Promise<PrescriptionRecord> {
    const { data } = await api.get<BackendPrescription>(`/prescriptions/${id}`);
    return adapt(data);
  },
};
