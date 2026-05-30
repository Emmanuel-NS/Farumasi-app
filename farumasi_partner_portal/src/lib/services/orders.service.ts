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
  status: string;
  payment_status?: string;
  payment_method?: string;
  total_amount: number;
  subtotal?: number;
  delivery_fee?: number;
  commission?: number;
  net_amount?: number;
  delivery_address?: string;
  is_delivery?: boolean;
  notes?: string;
  prescription_id?: string | null;
  prescription_url?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items: BackendOrderItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
  pharmacy?: { id: string; name: string };
  rider?: { id: string; user?: { id: string; full_name: string } };
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

export const ordersService = {
  async listPartnerOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/pharmacies/me/orders", { params });
    return data;
  },

  async getOrder(id: string): Promise<BackendOrder> {
    const { data } = await api.get<BackendOrder>(`/orders/${id}`);
    return data;
  },

  async updateOrderStatus(id: string, status: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/pharmacies/me/orders/${id}/status`, { status });
    return data;
  },
};
