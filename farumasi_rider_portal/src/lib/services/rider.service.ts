import api from "@/lib/api";

export interface RiderProfile {
  id: string;
  user_id: string;
  rider_type: string;
  vehicle_type?: string | null;
  availability_status: string;
  verification_status: string;
}

export interface RiderDelivery {
  id: string;
  order_id: string;
  status: string;
  pickup_address?: string | null;
  destination_address?: string | null;
  delivery_fee?: number;
  rider_earning?: number;
  accepted_at?: string | null;
  created_at: string;
  order?: {
    id: string;
    order_code?: string;
    delivery_address?: string;
    delivery_notes?: string;
    patient?: { full_name?: string; phone?: string };
    pharmacy?: { name?: string; address?: string };
    items?: { id: string; medication_name?: string; product_name?: string; quantity: number }[];
  };
}

export interface RiderEarnings {
  completed_deliveries_today: number;
  estimated_earnings_today: number;
  estimated_earnings_week: number;
  pending_payout: number;
}

export const riderService = {
  async getProfile(): Promise<RiderProfile> {
    const { data } = await api.get<RiderProfile>("/riders/me");
    return data;
  },

  async setAvailability(status: "online" | "offline" | "busy") {
    const { data } = await api.patch<RiderProfile>("/riders/me/availability", {
      availability_status: status,
    });
    return data;
  },

  async listDeliveries(): Promise<RiderDelivery[]> {
    const { data } = await api.get<RiderDelivery[]>("/riders/me/deliveries");
    return Array.isArray(data) ? data : [];
  },

  async getDelivery(id: string): Promise<RiderDelivery> {
    const { data } = await api.get<RiderDelivery>(`/deliveries/${id}`);
    return data;
  },

  async acceptDelivery(id: string) {
    const { data } = await api.patch<RiderDelivery>(`/riders/me/deliveries/${id}/accept`);
    return data;
  },

  async updateStatus(id: string, status: string) {
    const { data } = await api.patch<RiderDelivery>(`/riders/me/deliveries/${id}/status`, {
      status,
    });
    return data;
  },

  async rejectDelivery(id: string, reason: string, customReason?: string) {
    const { data } = await api.patch<RiderDelivery>(`/riders/me/deliveries/${id}/reject`, {
      reason,
      custom_reason: customReason,
    });
    return data;
  },

  async confirmQr(id: string, qrToken: string) {
    const { data } = await api.post<RiderDelivery>(`/riders/me/deliveries/${id}/confirm-qr`, {
      qr_token: qrToken,
    });
    return data;
  },

  async getEarnings(): Promise<RiderEarnings> {
    const { data } = await api.get<RiderEarnings>("/riders/me/earnings");
    return data;
  },
};
