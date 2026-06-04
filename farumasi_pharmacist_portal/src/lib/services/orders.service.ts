import api from "@/lib/api";

export interface BackendOrderItem {
  id: string;
  product_listing_id?: string | null;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sell_mode?: "pack" | "partial";
  product?: { id: string; name: string; image_url?: string | null } | null;
}

export interface BackendOrder {
  id: string;
  order_code?: string;
  order_status: string;
  /** Alias for order_status — normalised by service layer */
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  delivery_method?: string;
  delivery_address?: string;
  notes?: string;
  patient_access_code?: string | null;
  rider_access_code?: string | null;
  created_at: string;
  updated_at: string;
  items: BackendOrderItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
  pharmacy?: { id: string; name: string };
  partner_company?: { id: string; name: string };
  partner_company_id?: string | null;
  prescription_id?: string | null;
  delivery?: {
    id: string;
    status: string;
    rider?: {
      id: string;
      user?: { id: string; full_name: string };
    };
  };
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

/** Normalise order_status → also populate .status alias */
function norm(o: BackendOrder): BackendOrder {
  const status = o.order_status ?? o.status ?? "";
  return { ...o, status, order_status: status };
}

export interface OrderActivityEntry {
  id: string;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
}

export function isPrescriptionOrder(o: BackendOrder): boolean {
  return Boolean(o.prescription_id);
}

export const ordersService = {
  async getPharmacyOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/orders/pharmacy/all", { params });
    return { ...data, items: data.items.map(norm) };
  },

  async getOrderById(id: string): Promise<BackendOrder> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return norm(data);
  },

  async updateStatus(id: string, order_status: string, notes?: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/orders/${id}/status`, {
      order_status,
      ...(notes ? { notes } : {}),
    });
    return norm(data);
  },

  async assignDelivery(deliveryId: string, riderId: string): Promise<void> {
    await api.patch(`/deliveries/${deliveryId}/assign`, { rider_id: riderId });
  },

  async setRiderCode(orderId: string, riderCode: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/orders/${orderId}/rider-code`, {
      rider_access_code: riderCode,
    });
    return norm(data);
  },

  async verifyAccessCode(orderId: string, accessCode: string): Promise<BackendOrder> {
    const { data } = await api.post<BackendOrder>(`/orders/${orderId}/verify-access-code`, {
      access_code: accessCode,
    });
    return norm(data);
  },

  async getOrderActivity(orderId: string): Promise<OrderActivityEntry[]> {
    try {
      const { data } = await api.get<OrderActivityEntry[]>(
        `/orders/${orderId}/activity`,
      );
      return Array.isArray(data) ? data : [];
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return [];
      throw err;
    }
  },
};
