import api from "@/lib/api";

export interface BackendOrderItem {
  id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: { id: string; name: string; image_url?: string; prescription_required?: boolean };
}

export interface BackendOrder {
  id: string;
  order_status: string;
  status: string;          // alias for order_status — set by service normalizer
  order_code?: string | null;
  payment_status?: string;
  payment_method?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  commission?: number;
  net_amount?: number;
  delivery_address?: string;
  delivery_method?: string;
  is_delivery?: boolean;
  notes?: string;
  prescription_id?: string | null;
  prescription_url?: string | null;
  rider_access_code?: string | null;
  patient_access_code?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items: BackendOrderItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
  pharmacy?: { id: string; name: string };
  delivery?: {
    id: string;
    rider?: { id: string; user?: { id: string; full_name: string } };
  };
  rider?: { id: string; user?: { id: string; full_name: string } };
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

/** Backend sends `order_status`; normalise to also populate `status` for UI.
 *  Also normalises `is_delivery` from `delivery_method` if missing. */
function norm(o: BackendOrder): BackendOrder {
  const status = o.order_status ?? o.status ?? "";
  const is_delivery = o.is_delivery !== undefined ? o.is_delivery : o.delivery_method === "delivery";
  return { ...o, status, order_status: status, is_delivery };
}

export const ordersService = {
  async listPartnerOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/pharmacies/me/orders", { params });
    return { ...data, items: data.items.map(norm) };
  },

  async getOrder(id: string): Promise<BackendOrder> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return norm(data);
  },

  async updateOrderStatus(id: string, status: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/pharmacies/me/orders/${id}/status`, { order_status: status });
    return norm(data);
  },

  async verifyAccessCode(orderId: string, accessCode: string): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(`/orders/${orderId}/verify-access-code`, {
      access_code: accessCode,
    });
    return norm(data);
  },
};
