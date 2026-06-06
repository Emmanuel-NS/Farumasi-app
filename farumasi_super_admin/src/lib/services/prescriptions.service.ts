import api from "@/lib/api";
import { adminManagementService, type PrescriptionAdminSummary } from "./admin-management.service";

export interface AdminPrescriptionRow {
  id: string;
  reference: string;
  status: string;
  statusKey: string;
  prescriptionType: string;
  itemCount: number;
  createdAt: string;
}

interface BackendPrescription {
  id: string;
  status: string;
  prescription_type: string;
  created_at: string;
  items?: unknown[];
}

/** Same labels as pharmacist portal requests page */
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  active: "New",
  under_review: "Under Review",
  reviewed: "Cart Sent",
  fulfilled: "Fulfilled",
  partially_fulfilled: "Partially Fulfilled",
  cancelled: "Cancelled",
  expired: "Expired",
};

export type RxFilterLabel = "All" | "New" | "Under Review" | "Cart Sent" | "Fulfilled";

const CANCELLED_RX = new Set(["cancelled", "expired"]);

export function isCancelledRx(statusKey: string) {
  return CANCELLED_RX.has(statusKey);
}

export function matchesRxFilter(row: AdminPrescriptionRow, filter: RxFilterLabel) {
  if (filter === "All") return !isCancelledRx(row.statusKey);
  if (filter === "New") return row.statusKey === "draft" || row.statusKey === "active";
  if (filter === "Under Review") return row.statusKey === "under_review";
  if (filter === "Cart Sent") return row.statusKey === "reviewed";
  if (filter === "Fulfilled")
    return row.statusKey === "fulfilled" || row.statusKey === "partially_fulfilled";
  return true;
}

function toAdminRow(p: BackendPrescription): AdminPrescriptionRow {
  return {
    id: p.id,
    reference: p.id.slice(0, 8).toUpperCase(),
    statusKey: p.status,
    status: STATUS_LABEL[p.status] ?? p.status.replace(/_/g, " "),
    prescriptionType: p.prescription_type.replace(/_/g, " "),
    itemCount: Array.isArray(p.items) ? p.items.length : 0,
    createdAt: p.created_at,
  };
}

export const prescriptionsService = {
  async getSummary(): Promise<PrescriptionAdminSummary> {
    return adminManagementService.getPrescriptionSummary();
  },

  async listAdmin(params?: { offset?: number; limit?: number }): Promise<{
    items: AdminPrescriptionRow[];
    total: number;
  }> {
    const { data } = await api.get<{ items: BackendPrescription[]; total: number }>("/prescriptions/", {
      params: { limit: 100, ...params },
    });
    return { items: data.items.map(toAdminRow), total: data.total };
  },
};
