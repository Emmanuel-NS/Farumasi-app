import api from "@/lib/api";

export interface BackendDelivery {
  id: string;
  order_id: string;
  status: string;
  pickup_address?: string | null;
  destination_address?: string | null;
  rider_id?: string | null;
  order?: {
    id: string;
    order_code?: string;
    order_status?: string;
    payment_status?: string;
    delivery_method?: string;
    rider_access_code?: string | null;
    pharmacy?: { id: string; name: string } | null;
    partner_company?: { id: string; name: string } | null;
  };
  rider?: {
    id: string;
    user?: { full_name?: string | null; phone?: string | null };
  } | null;
}

export const deliveriesService = {
  async list(): Promise<BackendDelivery[]> {
    const { data } = await api.get<BackendDelivery[]>("/deliveries/");
    return data;
  },

  async assign(deliveryId: string, riderId: string): Promise<BackendDelivery> {
    const { data } = await api.patch<BackendDelivery>(`/deliveries/${deliveryId}/assign`, {
      rider_id: riderId,
    });
    return data;
  },
};
