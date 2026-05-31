import api from "@/lib/api";
import type { Order } from "@/types";

export interface BackendOrder {
  id: string;
  order_code?: string | null;
  order_status: string;
  payment_status: string;
  delivery_method?: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: Array<{ id: string; product_name: string; quantity: number; unit_price: number }>;
  patient?: { id: string; user?: { id: string; full_name: string } | null } | null;
  pharmacy?: { id: string; name: string } | null;
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

const STATUS_MAP: Record<string, Order["status"]> = {
  pending: "Pending", accepted: "Confirmed", preparing: "Processing",
  ready: "Ready", completed: "Delivered", rejected: "Cancelled",
  cancelled: "Cancelled", in_transit: "Out for Delivery",
};

function adapt(o: BackendOrder): Order {
  return {
    id: o.id,
    patientName: o.patient?.user?.full_name ?? "Unknown",
    pharmacyId: o.pharmacy?.id ?? "",
    pharmacyName: o.pharmacy?.name ?? "",
    prescriptionId: undefined,
    status: STATUS_MAP[o.order_status] ?? "Pending",
    items: o.items?.length ?? 0,
    total: o.total_amount,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    deliveryType: o.delivery_method === "delivery" ? "Delivery" : "Pickup",
  };
}

export const ordersService = {
  async getOrders(params?: { offset?: number; limit?: number; status?: string }): Promise<{ items: Order[]; total: number }> {
    const { data } = await api.get<PaginatedOrders>("/orders/", { params: { limit: 50, ...params } });
    return { items: data.items.map(adapt), total: data.total };
  },

  async getOrderById(id: string): Promise<Order> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return adapt(data);
  },

  async updateStatus(id: string, order_status: string): Promise<Order> {
    const { data } = await api.patch<BackendOrder>(`/orders/${id}/status`, { order_status });
    return adapt(data);
  },
};
