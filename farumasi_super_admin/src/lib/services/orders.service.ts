import api from "@/lib/api";
import { adminManagementService, type OrderAdminSummary } from "./admin-management.service";

export interface AdminOrderRow {
  id: string;
  orderCode: string;
  sellerName: string;
  sellerKind: "pharmacy" | "partner" | "unknown";
  orderKind: "prescription" | "partner";
  status: string;
  statusRaw: string;
  bucket: OrderBucket;
  paymentStatus: string;
  total: number;
  itemCount: number;
  deliveryMethod: string;
  createdAt: string;
}

export type OrderBucket = "pending" | "in_progress" | "completed" | "cancelled";

export type OrderFilterLabel = "All" | "Pending" | "In Progress" | "Completed" | "Cancelled";

export interface BackendOrder {
  id: string;
  order_code?: string | null;
  order_status: string;
  payment_status: string;
  delivery_method?: string | null;
  total_amount: number;
  created_at: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  prescription_id?: string | null;
  items?: Array<{ id: string }>;
  pharmacy?: { id: string; name: string } | null;
  partner_company?: { id: string; name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  in_transit: "In transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
  failed: "Failed",
  confirmed: "Confirmed",
  processing: "Processing",
};

const PENDING = new Set(["pending"]);
const IN_PROGRESS = new Set([
  "accepted",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "confirmed",
  "processing",
  "pharmacy_accepted",
  "in_transit",
]);
const COMPLETED = new Set(["completed"]);
const CANCELLED = new Set(["cancelled", "rejected", "failed"]);

export function classifyOrderBucket(statusRaw: string): OrderBucket {
  const s = (statusRaw || "pending").toLowerCase();
  if (CANCELLED.has(s)) return "cancelled";
  if (COMPLETED.has(s)) return "completed";
  if (PENDING.has(s)) return "pending";
  if (IN_PROGRESS.has(s)) return "in_progress";
  return "in_progress";
}

export function orderBucketApiParam(filter: OrderFilterLabel): string | undefined {
  const map: Record<OrderFilterLabel, string | undefined> = {
    All: undefined,
    Pending: "pending",
    "In Progress": "in_progress",
    Completed: "completed",
    Cancelled: "cancelled",
  };
  return map[filter];
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s;
}

function resolveSellerName(o: BackendOrder, names: Map<string, string>): string {
  if (o.pharmacy?.name) return o.pharmacy.name;
  if (o.partner_company?.name) return o.partner_company.name;
  if (o.pharmacy_id && names.has(o.pharmacy_id)) return names.get(o.pharmacy_id)!;
  if (o.partner_company_id && names.has(o.partner_company_id)) return names.get(o.partner_company_id)!;
  return "Unassigned";
}

function toAdminRow(o: BackendOrder, names: Map<string, string>): AdminOrderRow {
  const sellerKind =
    o.pharmacy_id || o.pharmacy ? "pharmacy" : o.partner_company_id || o.partner_company ? "partner" : "unknown";
  const raw = o.order_status?.toLowerCase() ?? "pending";
  return {
    id: o.id,
    orderCode: o.order_code ?? o.id.slice(0, 8).toUpperCase(),
    sellerName: resolveSellerName(o, names),
    sellerKind,
    orderKind: o.prescription_id ? "prescription" : "partner",
    status: STATUS_LABEL[raw] ?? capitalize(raw),
    statusRaw: raw,
    bucket: classifyOrderBucket(raw),
    paymentStatus: capitalize(o.payment_status ?? "unknown"),
    total: o.total_amount ?? 0,
    itemCount: o.items?.length ?? 0,
    deliveryMethod: o.delivery_method === "delivery" ? "Delivery" : "Pickup",
    createdAt: o.created_at,
  };
}

async function loadSellerNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  try {
    const [ph, pt] = await Promise.all([
      api.get<{ items: Array<{ id: string; name: string }> }>("/pharmacies/", { params: { limit: 100 } }),
      api.get<{ items: Array<{ id: string; name: string }> }>("/partners/", { params: { limit: 100 } }),
    ]);
    ph.data.items.forEach((p) => names.set(p.id, p.name));
    pt.data.items.forEach((p) => names.set(p.id, p.name));
  } catch {
    /* best-effort enrichment */
  }
  return names;
}

export const ordersService = {
  async getSummary(): Promise<OrderAdminSummary> {
    return adminManagementService.getOrderSummary();
  },

  async listAdmin(params?: {
    offset?: number;
    limit?: number;
    bucket?: string;
  }): Promise<{ items: AdminOrderRow[]; total: number }> {
    const [{ data }, names] = await Promise.all([
      api.get<{ items: BackendOrder[]; total: number }>("/orders/", {
        params: { limit: 100, ...params },
      }),
      loadSellerNames(),
    ]);
    return { items: data.items.map((o) => toAdminRow(o, names)), total: data.total };
  },
};

/** @deprecated use orderBucketApiParam */
export function orderStatusApiParam(filter: string): string | undefined {
  return orderBucketApiParam(filter as OrderFilterLabel);
}
