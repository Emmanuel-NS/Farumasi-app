import api from "@/lib/api";

export interface BackendDelivery {
  id: string;
  order_id: string;
  rider_id?: string | null;
  pickup_address?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  destination_address?: string | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  status: string;
  rejection_reason?: string | null;
  delivery_fee: number;
  rider_earning: number;
  accepted_at?: string | null;
  pickup_arrived_at?: string | null;
  picked_up_at?: string | null;
  delivery_started_at?: string | null;
  destination_arrived_at?: string | null;
  delivered_at?: string | null;
  elapsed_seconds?: number | null;
  qr_token?: string | null;
  qr_code?: string | null;
  qr_confirmed_at?: string | null;
  created_at: string;
}

export const deliveriesService = {
  async getForOrder(orderId: string): Promise<BackendDelivery | null> {
    const { data } = await api.get<BackendDelivery | null>(`/orders/${orderId}/delivery`);
    return data ?? null;
  },
};
