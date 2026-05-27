import api from "@/lib/api";

export type RiderAvailability = "available" | "busy" | "offline";

export interface BackendPharmacyDriver {
  rider_id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  vehicle_type: string | null;
  assigned_area: string | null;
  availability_status: RiderAvailability;
  verification_status: string;
  deliveries_count: number;
  completed_count: number;
  last_delivery_at: string | null;
}

export interface BackendDelivery {
  id: string;
  order_id: string;
  rider_id: string | null;
  pickup_address: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_address: string | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  status: string;
  delivery_fee: number;
  rider_earning: number;
  accepted_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export const fleetService = {
  async listDrivers(): Promise<BackendPharmacyDriver[]> {
    const { data } = await api.get<BackendPharmacyDriver[]>("/pharmacies/me/drivers");
    return data;
  },
  async listDeliveries(status?: string): Promise<BackendDelivery[]> {
    const { data } = await api.get<BackendDelivery[]>("/pharmacies/me/deliveries", {
      params: status ? { status } : undefined,
    });
    return data;
  },
};
