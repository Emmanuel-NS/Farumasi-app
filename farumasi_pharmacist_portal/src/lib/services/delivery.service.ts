import api from "@/lib/api";

export interface BackendDelivery {
  id: string;
  order_id: string;
  pickup_address?: string | null;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  destination_address?: string | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  status: string;
  elapsed_seconds?: number | null;
  delivery_started_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
  rider?: {
    id: string;
    user?: { id: string; full_name: string; phone?: string };
  };
}

const STATUS_PROGRESS: Record<string, number> = {
  pending_assignment: 0.05,
  assigned: 0.1,
  accepted: 0.15,
  going_to_pickup: 0.25,
  arrived_at_pickup: 0.35,
  picked_up: 0.45,
  out_for_delivery: 0.6,
  arrived_at_destination: 0.85,
  qr_pending: 0.92,
  delivered: 1,
};

export function deliveryProgress(delivery: BackendDelivery): number {
  return STATUS_PROGRESS[delivery.status] ?? 0.2;
}

export function estimateDeliveryEtaMinutes(delivery: BackendDelivery): number | null {
  if (delivery.delivered_at) return 0;
  const elapsed = delivery.elapsed_seconds ?? 0;
  const assumedTotalSeconds = 30 * 60;
  const remaining = Math.ceil((assumedTotalSeconds - elapsed) / 60);
  return Math.max(1, remaining);
}

export function coordsPair(
  lat?: number | null,
  lng?: number | null,
): [number, number] | null {
  if (lat == null || lng == null) return null;
  return [lat, lng];
}

export const deliveryService = {
  async getDeliveryForOrder(orderId: string): Promise<BackendDelivery | null> {
    try {
      const { data } = await api.get<BackendDelivery | null>(`/orders/${orderId}/delivery`);
      return data;
    } catch {
      return null;
    }
  },
};
