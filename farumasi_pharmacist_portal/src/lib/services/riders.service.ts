import api from "@/lib/api";

export interface RiderUserBrief {
  id: string;
  full_name?: string | null;
  phone?: string | null;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  rider_type: string;
  vehicle_type?: string | null;
  assigned_area?: string | null;
  availability_status: string;
  verification_status: string;
  user?: RiderUserBrief | null;
}

export const ridersService = {
  async listRiders(availableOnly = true): Promise<RiderProfile[]> {
    const { data } = await api.get<RiderProfile[]>("/riders", {
      params: { available_only: availableOnly },
    });
    return data;
  },
};
