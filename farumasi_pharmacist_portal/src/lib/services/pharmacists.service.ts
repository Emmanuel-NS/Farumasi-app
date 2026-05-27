import api from "@/lib/api";

export type AvailabilityStatus = "available" | "busy" | "offline";

export interface BackendPharmacistProfile {
  id: string;
  user_id: string;
  license_number?: string | null;
  specialization?: string | null;
  bio?: string | null;
  years_of_experience?: number | null;
  verification_status: string;
  status: string;
  availability_status: AvailabilityStatus;
  created_at: string;
}

export interface PharmacistProfileUpdate {
  license_number?: string | null;
  specialization?: string | null;
  bio?: string | null;
  years_of_experience?: number | null;
  availability_status?: AvailabilityStatus;
}

export const pharmacistsService = {
  async getMyProfile(): Promise<BackendPharmacistProfile | null> {
    try {
      const { data } = await api.get<BackendPharmacistProfile>("/pharmacists/me");
      return data;
    } catch {
      return null;
    }
  },

  async updateMyProfile(input: PharmacistProfileUpdate): Promise<BackendPharmacistProfile> {
    const { data } = await api.put<BackendPharmacistProfile>("/pharmacists/me", input);
    return data;
  },

  async setAvailability(status: AvailabilityStatus): Promise<BackendPharmacistProfile> {
    const { data } = await api.patch<BackendPharmacistProfile>("/pharmacists/me/availability", {
      availability_status: status,
    });
    return data;
  },
};
