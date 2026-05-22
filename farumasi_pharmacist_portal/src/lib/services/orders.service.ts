import api from "@/lib/api";

export interface BackendOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: { id: string; name: string; image_url?: string };
}

export interface BackendOrder {
  id: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  delivery_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: BackendOrderItem[];
  patient?: {
    id: string;
    user?: { id: string; full_name: string; email: string; phone?: string };
  };
  pharmacy?: { id: string; name: string };
  rider?: {
    id: string;
    user?: { id: string; full_name: string };
  };
}

export interface PaginatedOrders {
  items: BackendOrder[];
  total: number;
  offset: number;
  limit: number;
}

export const ordersService = {
  async getPharmacyOrders(params?: {
    offset?: number;
    limit?: number;
    status?: string;
  }): Promise<PaginatedOrders> {
    const { data } = await api.get<PaginatedOrders>("/orders/pharmacy/all", { params });
    return data;
  },

  async updateStatus(id: string, status: string): Promise<BackendOrder> {
    const { data } = await api.patch<BackendOrder>(`/orders/${id}/status`, { status });
    return data;
  },
};
